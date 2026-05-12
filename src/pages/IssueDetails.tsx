import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ArticleLineupModal from '../components/ArticleLineupModal';
import EditIssueDetailsModal from '../components/EditIssueDetailsModal';
import FolioArrangeModal from '../components/FolioArrangeModal';
import FolioReviewModal from '../components/FolioReviewModal';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Toast, { ToastData } from '../components/Toast';
import { useIssues } from '../hooks/useIssues';
import type {
  ArticleLineupRevision,
  FolioArrangement,
  FolioCreationRevision,
  FolioPreparationRevision,
  FolioPreparationRevisionReason,
  Issue,
  IssueOutputFormat,
  IssueType,
} from '../types/issue';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateFormat';
import './IssueDetails.css';

interface IssueDetailsProps {
  onLogout: () => void;
}

type DetailMilestone =
  | 'Article Lineup'
  | 'Folio Creation'
  | 'Folio Preparation'
  | 'Folio Review'
  | 'Print'
  | 'Online Publication';

const OUTPUT_FORMAT_MILESTONES: Record<IssueOutputFormat, DetailMilestone[]> = {
  print: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Print'],
  online: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Online Publication'],
  both: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Print', 'Online Publication'],
};

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  regular: 'Regular',
  special: 'Special',
};

const OUTPUT_FORMAT_LABEL: Record<IssueOutputFormat, string> = {
  print: 'Print',
  online: 'Online',
  both: 'Print & Online',
};

const CURRENT_USER_NAME = 'John Doe';
const SYSTEM_USER_NAME = 'System';
const ESTIMATED_MILESTONE_DAYS = 5;
const FOLIO_PREPARATION_DURATION_MS = 10 * 1000;
const PRINT_DURATION_MS = 10 * 1000;
const ONLINE_PUBLICATION_DURATION_MS = 10 * 1000;

const getValidDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDurationLabel = (start: Date, end: Date): string => {
  const milliseconds = Math.max(0, end.getTime() - start.getTime());
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (milliseconds < minute) {
    const seconds = Math.max(1, Math.round(milliseconds / 1000));
    return `${seconds} ${seconds === 1 ? 'sec' : 'secs'}`;
  }

  const parts: string[] = [];
  const days = Math.floor(milliseconds / day);
  const hours = Math.floor((milliseconds % day) / hour);
  const minutes = Math.floor((milliseconds % hour) / minute);

  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hr' : 'hrs'}`);
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes} min`);
  }

  return parts.slice(0, 2).join(' ');
};

const statusLabel = (status: Issue['status']): string =>
  status === 'completed' ? 'Completed' : 'In progress';

const getNextMilestoneAfterFolioReview = (outputFormat: IssueOutputFormat): Issue['milestone'] =>
  outputFormat === 'online' ? 'Online Publication' : 'Print';

const getMilestoneAfterPrint = (outputFormat: IssueOutputFormat): Issue['milestone'] =>
  outputFormat === 'both' ? 'Online Publication' : 'Print';

const createFolioPreparationRevision = (
  issue: Issue,
  reason: FolioPreparationRevisionReason,
  submittedAt: string,
): FolioPreparationRevision | undefined => {
  const startedAt = issue.folioPreparationStartedAt ?? issue.folioArrangementConfirmedAt;
  if (!startedAt) return undefined;

  return {
    id: `${reason}-${submittedAt}`,
    startedAt,
    completedAt: issue.folioPreparationConfirmedAt ?? submittedAt,
    reason,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
  };
};

const getFolioPreparationRevisions = (
  issue: Issue,
  reason: FolioPreparationRevisionReason,
  submittedAt: string,
): FolioPreparationRevision[] => {
  const revision = createFolioPreparationRevision(issue, reason, submittedAt);
  return revision
    ? [...(issue.folioPreparationRevisions ?? []), revision]
    : issue.folioPreparationRevisions ?? [];
};

const createArticleLineupRevision = (
  issue: Issue,
  submittedAt: string,
): ArticleLineupRevision | undefined => {
  const completedAt = issue.articleLineupConfirmedAt;
  if (!completedAt) return undefined;

  return {
    id: `article-lineup-${submittedAt}`,
    startedAt: issue.articleLineupStartedAt ?? issue.createdAt,
    completedAt,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
    articleCount: issue.assignedArticleIds.length,
  };
};

const getArticleLineupRevisions = (issue: Issue, submittedAt: string): ArticleLineupRevision[] => {
  const revision = createArticleLineupRevision(issue, submittedAt);
  return revision
    ? [...(issue.articleLineupRevisions ?? []), revision]
    : issue.articleLineupRevisions ?? [];
};

const createFolioCreationRevision = (
  issue: Issue,
  submittedAt: string,
): FolioCreationRevision | undefined => {
  const completedAt = issue.folioArrangementConfirmedAt;
  if (!completedAt) return undefined;

  return {
    id: `folio-creation-${submittedAt}`,
    startedAt: issue.articleLineupConfirmedAt ?? issue.createdAt,
    completedAt,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
    itemCount: issue.folioArrangement?.items.length ?? 0,
  };
};

const getFolioCreationRevisions = (issue: Issue, submittedAt: string): FolioCreationRevision[] => {
  const revision = createFolioCreationRevision(issue, submittedAt);
  return revision
    ? [...(issue.folioCreationRevisions ?? []), revision]
    : issue.folioCreationRevisions ?? [];
};

const InProgressStatusIcon = () => (
  <svg
    className="issue-status-pill-icon"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <mask
      id="issue-status-inprogress-mask"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="14"
      height="14"
    >
      <rect width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#issue-status-inprogress-mask)">
      <path
        d="M2.47925 10.675C2.1098 10.2375 1.81328 9.75622 1.58966 9.23122C1.36605 8.70622 1.22508 8.15691 1.16675 7.5833H2.36258C2.42091 8.00136 2.52786 8.4024 2.68341 8.78643C2.83897 9.17045 3.04314 9.52775 3.29591 9.8583L2.47925 10.675ZM1.16675 6.41663C1.24453 5.84302 1.39036 5.29372 1.60425 4.76872C1.81814 4.24372 2.1098 3.76247 2.47925 3.32497L3.29591 4.14163C3.04314 4.47219 2.83897 4.82948 2.68341 5.21351C2.52786 5.59754 2.42091 5.99858 2.36258 6.41663H1.16675ZM6.38758 12.8041C5.81397 12.7458 5.2671 12.6073 4.74696 12.3885C4.22682 12.1698 3.74314 11.8805 3.29591 11.5208L4.11258 10.675C4.45286 10.9277 4.81258 11.1368 5.19175 11.3021C5.57092 11.4673 5.96953 11.5791 6.38758 11.6375V12.8041ZM4.14175 3.32497L3.29591 2.47913C3.75286 2.11941 4.24383 1.83018 4.76883 1.61143C5.29383 1.39268 5.84314 1.25413 6.41675 1.1958V2.36247C5.99869 2.4208 5.59765 2.53261 5.21362 2.69788C4.8296 2.86316 4.4723 3.07219 4.14175 3.32497ZM7.55425 12.8041V11.6375C7.98203 11.5791 8.38793 11.4698 8.77196 11.3093C9.15598 11.1489 9.51814 10.9375 9.85842 10.675L10.7042 11.5208C10.2473 11.8902 9.7539 12.1819 9.22404 12.3958C8.69418 12.6097 8.13758 12.7458 7.55425 12.8041ZM9.88758 3.32497C9.5473 3.07219 9.18272 2.86316 8.79383 2.69788C8.40494 2.53261 8.00147 2.4208 7.58342 2.36247V1.1958C8.15703 1.25413 8.70876 1.39268 9.23862 1.61143C9.76849 1.83018 10.257 2.11941 10.7042 2.47913L9.88758 3.32497ZM11.5209 10.675L10.7042 9.8583C10.957 9.52775 11.1612 9.17045 11.3167 8.78643C11.4723 8.4024 11.5792 8.00136 11.6376 7.5833H12.8334C12.7556 8.15691 12.6098 8.70622 12.3959 9.23122C12.182 9.75622 11.8904 10.2375 11.5209 10.675ZM11.6376 6.41663C11.5792 5.99858 11.4723 5.59754 11.3167 5.21351C11.1612 4.82948 10.957 4.47219 10.7042 4.14163L11.5209 3.32497C11.8904 3.76247 12.1869 4.24372 12.4105 4.76872C12.6341 5.29372 12.7751 5.84302 12.8334 6.41663H11.6376Z"
        fill="#0566ED"
      />
    </g>
  </svg>
);

const CompletedStatusIcon = () => (
  <svg className="issue-status-pill-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M5.54171 9.45008L3.09171 7.00008L2.33337 7.75841L5.54171 10.9667L12.25 4.25841L11.4917 3.50008L5.54171 9.45008Z"
      fill="currentColor"
    />
  </svg>
);

const getActiveMilestoneIndex = (issue: Issue, milestones: DetailMilestone[]): number => {
  if (issue.status === 'completed') return milestones.length;

  const normalizedCurrent = issue.milestone === 'Final Review' ? 'Folio Review' : issue.milestone;
  const index = milestones.findIndex(m => m === normalizedCurrent);
  return index >= 0 ? index : 0;
};

const getMilestoneConfirmation = (issue: Issue, label: DetailMilestone, hasLineupHistory: boolean) => {
  if (label === 'Article Lineup' && hasLineupHistory) {
    return {
      confirmedAt: issue.articleLineupConfirmedAt ?? issue.createdAt,
      confirmedBy: issue.articleLineupConfirmedBy ?? CURRENT_USER_NAME,
    };
  }

  if (label === 'Folio Creation' && issue.folioArrangementConfirmedAt) {
    return {
      confirmedAt: issue.folioArrangementConfirmedAt,
      confirmedBy: issue.folioArrangementConfirmedBy ?? CURRENT_USER_NAME,
    };
  }

  if (label === 'Folio Preparation' && issue.folioPreparationConfirmedAt) {
    return {
      confirmedAt: issue.folioPreparationConfirmedAt,
      confirmedBy: issue.folioPreparationConfirmedBy ?? SYSTEM_USER_NAME,
    };
  }

  if (label === 'Folio Review' && issue.folioReviewConfirmedAt) {
    return {
      confirmedAt: issue.folioReviewConfirmedAt,
      confirmedBy: issue.folioReviewConfirmedBy ?? CURRENT_USER_NAME,
    };
  }

  if (label === 'Print' && issue.printConfirmedAt) {
    return {
      confirmedAt: issue.printConfirmedAt,
      confirmedBy: issue.printConfirmedBy ?? SYSTEM_USER_NAME,
    };
  }

  if (label === 'Online Publication' && issue.onlinePublicationConfirmedAt) {
    return {
      confirmedAt: issue.onlinePublicationConfirmedAt,
      confirmedBy: issue.onlinePublicationConfirmedBy ?? SYSTEM_USER_NAME,
    };
  }

  return {
    confirmedAt: undefined,
    confirmedBy: undefined,
  };
};

const IssueDetails = ({ onLogout }: IssueDetailsProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [showFolioArrangeModal, setShowFolioArrangeModal] = useState(false);
  const [showFolioReviewModal, setShowFolioReviewModal] = useState(false);
  const [showArticleLineupRevisions, setShowArticleLineupRevisions] = useState(false);
  const [showFolioCreationRevisions, setShowFolioCreationRevisions] = useState(false);
  const [showFolioPreparationRevisions, setShowFolioPreparationRevisions] = useState(false);
  const navigate = useNavigate();
  const { issueId } = useParams();
  const [searchParams] = useSearchParams();
  const { issues, updateIssue } = useIssues();

  const issue = issues.find(i => i.id === issueId);
  const isIssueHistory = issue?.status === 'completed';

  useEffect(() => {
    setShowArticleLineupRevisions(false);
    setShowFolioCreationRevisions(false);
    setShowFolioPreparationRevisions(false);
  }, [issueId]);

  useEffect(() => {
    if (!issue) return;

    const task = searchParams.get('task');
    if (!task) return;

    if (task === 'article-lineup') {
      setShowLineupModal(true);
    } else if (task === 'folio-creation') {
      setShowFolioArrangeModal(true);
    } else if (task === 'folio-review') {
      setShowFolioReviewModal(true);
    }

    navigate(`/issues/${issue.id}`, { replace: true });
  }, [issue, navigate, searchParams]);

  useEffect(() => {
    if (
      !issue
      || issue.milestone !== 'Folio Preparation'
      || !issue.folioArrangementConfirmedAt
      || issue.folioPreparationConfirmedAt
    ) {
      return;
    }

    const startedAt = getValidDate(issue.folioPreparationStartedAt ?? issue.folioArrangementConfirmedAt).getTime();
    const completesAt = startedAt + FOLIO_PREPARATION_DURATION_MS;
    const delay = Math.max(0, completesAt - Date.now());

    const timeoutId = window.setTimeout(() => {
      updateIssue(issue.id, {
        folioPreparationConfirmedAt: new Date(completesAt).toISOString(),
        folioPreparationConfirmedBy: SYSTEM_USER_NAME,
        milestone: 'Final Review',
      });
      setToast({
        id: `folio-preparation-completed-${Date.now()}`,
        variant: 'info',
        message: 'Folio preparation completed. Folio review is now in progress.',
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [
    issue,
    updateIssue,
  ]);

  useEffect(() => {
    if (
      !issue
      || issue.milestone !== 'Print'
      || !issue.folioReviewConfirmedAt
      || issue.printConfirmedAt
    ) {
      return;
    }

    const startedAt = getValidDate(issue.folioReviewConfirmedAt).getTime();
    const completesAt = startedAt + PRINT_DURATION_MS;
    const delay = Math.max(0, completesAt - Date.now());

    const timeoutId = window.setTimeout(() => {
      const isPrintOnly = issue.outputFormat === 'print';
      updateIssue(issue.id, {
        printConfirmedAt: new Date(completesAt).toISOString(),
        printConfirmedBy: SYSTEM_USER_NAME,
        milestone: getMilestoneAfterPrint(issue.outputFormat),
        status: isPrintOnly ? 'completed' : 'in-progress',
      });
      setToast({
        id: `print-completed-${Date.now()}`,
        variant: 'info',
        message: isPrintOnly
          ? 'Print completed. Issue processing is complete.'
          : 'Print completed. Online publication is now in progress.',
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [
    issue,
    updateIssue,
  ]);

  useEffect(() => {
    if (
      !issue
      || issue.milestone !== 'Online Publication'
      || issue.onlinePublicationConfirmedAt
    ) {
      return;
    }

    const onlineStartedAt = issue.printConfirmedAt ?? issue.folioReviewConfirmedAt;
    if (!onlineStartedAt) return;

    const startedAt = getValidDate(onlineStartedAt).getTime();
    const completesAt = startedAt + ONLINE_PUBLICATION_DURATION_MS;
    const delay = Math.max(0, completesAt - Date.now());

    const timeoutId = window.setTimeout(() => {
      updateIssue(issue.id, {
        onlinePublicationConfirmedAt: new Date(completesAt).toISOString(),
        onlinePublicationConfirmedBy: SYSTEM_USER_NAME,
        milestone: 'Online Publication',
        status: 'completed',
      });
      setToast({
        id: `online-publication-completed-${Date.now()}`,
        variant: 'info',
        message: 'Online publication completed. Issue processing is complete.',
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [
    issue,
    updateIssue,
  ]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const dismissToast = () => setToast(null);

  const restartFolioPreparation = (
    currentIssue: Issue,
    reason: FolioPreparationRevisionReason,
    submittedAt: string,
    message: string,
  ) => {
    updateIssue(currentIssue.id, {
      folioPreparationStartedAt: submittedAt,
      folioPreparationRevisions: getFolioPreparationRevisions(currentIssue, reason, submittedAt),
      folioPreparationConfirmedAt: undefined,
      folioPreparationConfirmedBy: undefined,
      folioReviewConfirmedAt: undefined,
      folioReviewConfirmedBy: undefined,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: 'Folio Preparation',
      status: 'in-progress',
    });
    setShowFolioReviewModal(false);
    setToast({
      id: `folio-preparation-restarted-${Date.now()}`,
      variant: 'success',
      message,
    });
  };

  const handleEditDetails = () => {
    setShowEditModal(true);
  };

  const handleOpenLineup = () => {
    setShowLineupModal(true);
  };

  const handleArrangeFolio = () => {
    setShowFolioArrangeModal(true);
  };

  const handleReviewFolio = () => {
    setShowFolioReviewModal(true);
  };

  const handleApproveFolioReview = () => {
    if (!issue) return;

    const reviewedAt = new Date().toISOString();
    if (issue.folioReviewConfirmedAt) {
      restartFolioPreparation(
        issue,
        're-review',
        reviewedAt,
        'Re-review submitted. Folio preparation restarted.',
      );
      return;
    }

    updateIssue(issue.id, {
      folioReviewConfirmedAt: reviewedAt,
      folioReviewConfirmedBy: CURRENT_USER_NAME,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: getNextMilestoneAfterFolioReview(issue.outputFormat),
    });
    setShowFolioReviewModal(false);
    setToast({
      id: `folio-reviewed-${Date.now()}`,
      variant: 'success',
      message: 'Folio review approved successfully.',
    });
  };

  const handleSubmitFolioCorrection = () => {
    if (!issue) return;

    const submittedAt = new Date().toISOString();
    restartFolioPreparation(
      issue,
      'correction',
      submittedAt,
      'Correction uploaded. Folio preparation restarted.',
    );
  };

  const handleConfirmLineup = (id: string, articleIds: string[]) => {
    if (articleIds.length === 0) return;

    const currentIssue = issue?.id === id ? issue : issues.find(i => i.id === id);
    const confirmedAt = new Date().toISOString();
    const isLineupRevision = Boolean(currentIssue?.articleLineupConfirmedAt);

    updateIssue(id, {
      assignedArticleIds: articleIds,
      articleLineupStartedAt: confirmedAt,
      articleLineupRevisions: currentIssue
        ? getArticleLineupRevisions(currentIssue, confirmedAt)
        : [],
      articleLineupConfirmedAt: confirmedAt,
      articleLineupConfirmedBy: CURRENT_USER_NAME,
      folioArrangement: undefined,
      folioCreationRevisions: undefined,
      folioArrangementConfirmedAt: undefined,
      folioArrangementConfirmedBy: undefined,
      folioPreparationStartedAt: undefined,
      folioPreparationRevisions: undefined,
      folioPreparationConfirmedAt: undefined,
      folioPreparationConfirmedBy: undefined,
      folioReviewConfirmedAt: undefined,
      folioReviewConfirmedBy: undefined,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: 'Folio Creation',
      status: 'in-progress',
    });
    setToast({
      id: `lineup-confirmed-${Date.now()}`,
      variant: 'success',
      message: isLineupRevision
        ? 'Article lineup updated. Folio creation needs to be completed again.'
        : 'Article lineup confirmed successfully.',
    });
  };

  const handleSaveIssueDetails = (id: string, updates: Partial<Issue>) => {
    updateIssue(id, updates);
    setToast({
      id: `issue-updated-${Date.now()}`,
      variant: 'success',
      message: 'Issue details updated successfully.',
    });
  };

  const handleSaveFolioArrangement = (id: string, arrangement: FolioArrangement) => {
    const currentIssue = issue?.id === id ? issue : issues.find(i => i.id === id);
    const folioCreationRevisions = currentIssue
      ? getFolioCreationRevisions(currentIssue, arrangement.submittedAt)
      : [];
    const folioPreparationRevisions = currentIssue
      ? getFolioPreparationRevisions(currentIssue, 'folio-edit', arrangement.submittedAt)
      : [];

    updateIssue(id, {
      folioArrangement: arrangement,
      folioCreationRevisions,
      folioArrangementConfirmedAt: arrangement.submittedAt,
      folioArrangementConfirmedBy: arrangement.submittedBy,
      folioPreparationStartedAt: arrangement.submittedAt,
      folioPreparationRevisions,
      folioPreparationConfirmedAt: undefined,
      folioPreparationConfirmedBy: undefined,
      folioReviewConfirmedAt: undefined,
      folioReviewConfirmedBy: undefined,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: 'Folio Preparation',
      status: 'in-progress',
    });
    setToast({
      id: `folio-arranged-${Date.now()}`,
      variant: 'success',
      message: 'Folio creation completed successfully',
    });
  };

  const timeline = useMemo(() => {
    if (!issue) return [];
    const milestones = OUTPUT_FORMAT_MILESTONES[issue.outputFormat];
    const base = getValidDate(issue.createdAt);
    const activeIndex = getActiveMilestoneIndex(issue, milestones);
    const hasLineupHistory = Boolean(issue.articleLineupConfirmedAt) || activeIndex > 0;
    let nextStart = base;

    return milestones.map((label, index) => {
      const { confirmedAt, confirmedBy } = getMilestoneConfirmation(issue, label, hasLineupHistory);
      const start = label === 'Article Lineup' && issue.articleLineupStartedAt
        ? getValidDate(issue.articleLineupStartedAt)
        : label === 'Folio Preparation' && issue.folioPreparationStartedAt
          ? getValidDate(issue.folioPreparationStartedAt)
          : nextStart;
      const confirmedEnd = confirmedAt ? getValidDate(confirmedAt) : undefined;
      const estimatedCompletion = addDays(start, ESTIMATED_MILESTONE_DAYS);
      const completion = confirmedEnd ?? estimatedCompletion;

      nextStart = completion;

      return {
        label,
        start,
        completion,
        duration: getDurationLabel(start, completion),
        confirmedAt,
        confirmedBy,
        isSystemGenerated: label === 'Folio Preparation' || label === 'Print' || label === 'Online Publication',
        state: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'upcoming',
      };
    });
  }, [issue]);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarCollapsed(prev => !prev)} onLogout={handleLogout} />

      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />

        <main className={`dashboard-main${sidebarCollapsed ? ' dashboard-main--sidebar-collapsed' : ''}`}>
          <div className="issue-details-page">
            {!issue ? (
              <div className="issue-details-empty">
                <div className="issue-details-breadcrumb">
                  <Link to="/issues">Issues</Link>
                  <span aria-hidden>›</span>
                  <span>Issue not found</span>
                </div>
                <h1 className="issue-details-title">Issue not found</h1>
                <p className="issue-details-empty-text">
                  This issue may have been deleted or is no longer available in this session.
                </p>
                <Link to="/issues" className="issue-details-back-link">
                  Back to Issues
                </Link>
              </div>
            ) : (
              <>
                <div className="issue-details-topbar">
                  <div>
                    <nav className="issue-details-breadcrumb" aria-label="Breadcrumb">
                      <Link to="/issues">
                        {issue.status === 'completed' ? 'Issue History' : 'Issue In progress'}
                      </Link>
                      <span aria-hidden>›</span>
                    </nav>
                    <h1 className="issue-details-title">
                      {issue.issueTitle.trim() || `${issue.journalAcronym} - ${issue.volume}/${issue.issue}`}
                    </h1>
                  </div>

                  {!isIssueHistory && (
                    <button type="button" className="issue-details-conversation-button">
                      New Conversation
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M7 10l5 5 5-5H7Z" fill="currentColor" />
                      </svg>
                    </button>
                  )}
                </div>

                <section className="issue-details-section" aria-labelledby="issue-details-heading">
                  <div className="issue-details-section-head">
                    <h2 id="issue-details-heading" className="issue-details-section-title">
                      Issue Details
                    </h2>
                    {!isIssueHistory && (
                      <button type="button" className="issue-details-edit-button" onClick={handleEditDetails}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
                            fill="currentColor"
                          />
                        </svg>
                        Edit Details
                      </button>
                    )}
                  </div>

                  <dl className="issue-details-grid">
                    <div className="issue-details-cell">
                      <dt>Journal</dt>
                      <dd>{issue.journalAcronym}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Vol/Issue</dt>
                      <dd>{issue.volume}/{issue.issue}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Type</dt>
                      <dd>{ISSUE_TYPE_LABEL[issue.issueType]}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Cover Month</dt>
                      <dd>{issue.coverMonth || '—'}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Status</dt>
                      <dd>
                        <span className={`issue-status-pill issue-status-pill--${issue.status}`}>
                          {issue.status === 'in-progress' && <InProgressStatusIcon />}
                          {issue.status === 'completed' && <CompletedStatusIcon />}
                          {statusLabel(issue.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Assigned Articles</dt>
                      <dd>{issue.assignedArticleIds.length}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Issue Close Date</dt>
                      <dd>{formatDisplayDate(issue.issueCloseDate)}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Online Pub. Date</dt>
                      <dd>{formatDisplayDate(issue.publicationDate)}</dd>
                    </div>
                    <div className="issue-details-cell issue-details-cell--full">
                      <dt>Output Format</dt>
                      <dd>{OUTPUT_FORMAT_LABEL[issue.outputFormat]}</dd>
                    </div>
                  </dl>
                </section>

                <section className="issue-progress-section" aria-labelledby="issue-progress-heading">
                  <h2 id="issue-progress-heading" className="issue-details-section-title">
                    Progress
                  </h2>
                  <ol className="issue-progress-list">
                    {timeline.map((step, index) => (
                      <li
                        key={step.label}
                        className={`issue-progress-item issue-progress-item--${step.state}`}
                      >
                        <span className="issue-progress-marker" aria-hidden>
                          {step.state === 'completed' && (
                            <svg
                              className="issue-progress-marker-check"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="8" cy="8" r="8" fill="#1c40ca" />
                              <path
                                d="M4.75 8.15 7 10.4 11.35 5.55"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {index < timeline.length - 1 && <span className="issue-progress-line" aria-hidden />}
                        <div className="issue-progress-content">
                          <div className="issue-progress-row">
                            <span className="issue-progress-title">{step.label}</span>
                            {!isIssueHistory && step.label === 'Article Lineup' && step.confirmedAt && (
                              <button
                                type="button"
                                className="issue-progress-edit-action"
                                onClick={handleOpenLineup}
                              >
                                Edit
                              </button>
                            )}
                            {!isIssueHistory && step.label === 'Folio Creation' && step.confirmedAt && (
                              <button
                                type="button"
                                className="issue-progress-edit-action"
                                onClick={handleArrangeFolio}
                              >
                                Edit
                              </button>
                            )}
                            {!isIssueHistory && step.label === 'Folio Review' && step.confirmedAt && (
                              <button
                                type="button"
                                className="issue-progress-edit-action"
                                onClick={handleReviewFolio}
                              >
                                Re-review
                              </button>
                            )}
                            {!isIssueHistory && step.state === 'active' && step.label === 'Article Lineup' && !step.confirmedAt && (
                              <button type="button" className="issue-progress-action" onClick={handleOpenLineup}>
                                {issue.assignedArticleIds.length > 0 ? 'Confirm' : 'Create'}
                              </button>
                            )}
                            {!isIssueHistory && step.state === 'active' && step.label === 'Folio Creation' && (
                              <button type="button" className="issue-progress-action" onClick={handleArrangeFolio}>
                                Arrange
                              </button>
                            )}
                            {!isIssueHistory && step.state === 'active' && step.label === 'Folio Review' && (
                              <button type="button" className="issue-progress-action" onClick={handleReviewFolio}>
                                Review
                              </button>
                            )}
                          </div>
                          {step.confirmedAt ? (
                            <div className="issue-progress-details">
                              <p className="issue-progress-dates issue-progress-dates--completed">
                                <span>
                                  Start: <span className="issue-progress-date-value">{formatDisplayDateTime(step.start)}</span>
                                </span>
                                <span className="issue-progress-date-separator">|</span>
                                <span>
                                  End: <span className="issue-progress-date-value">{formatDisplayDateTime(step.completion)}</span>
                                </span>
                                <span className="issue-progress-date-separator">|</span>
                                <span>
                                  Duration: <span className="issue-progress-date-value">{step.duration}</span>
                                </span>
                              </p>
                              {!step.isSystemGenerated && (
                                <p className="issue-progress-confirmed">
                                  <span>
                                    Confirmed by{' '}
                                    <span className="issue-progress-confirmed-value">{step.confirmedBy}</span>
                                  </span>
                                  <span className="issue-progress-confirmed-dot" aria-hidden />
                                  <span className="issue-progress-confirmed-value">
                                    {formatDisplayDateTime(step.confirmedAt)}
                                  </span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="issue-progress-dates">
                              <span>Start: {formatDisplayDateTime(step.start)}</span>
                              <span className="issue-progress-date-separator">|</span>
                              <span>Est. Completion: {formatDisplayDateTime(step.completion)}</span>
                            </p>
                          )}
                          {step.label === 'Article Lineup' && issue.articleLineupRevisions?.length ? (
                            <div className="issue-progress-revisions">
                              {showArticleLineupRevisions && (
                                <div className="issue-progress-revision-list">
                                  {issue.articleLineupRevisions.map((revision, revisionIndex) => {
                                    const revisionStart = getValidDate(revision.startedAt);
                                    const revisionEnd = getValidDate(revision.completedAt);
                                    return (
                                      <div className="issue-progress-revision" key={revision.id}>
                                        <p className="issue-progress-revision-title">
                                          Revision {revisionIndex + 1}
                                        </p>
                                        <p className="issue-progress-revision-dates">
                                          <span>
                                            Start:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionStart)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            End:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionEnd)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            Duration:{' '}
                                            <span className="issue-progress-date-value">
                                              {getDurationLabel(revisionStart, revisionEnd)}
                                            </span>
                                          </span>
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <button
                                type="button"
                                className="issue-progress-revision-toggle"
                                onClick={() => setShowArticleLineupRevisions(prev => !prev)}
                              >
                                {showArticleLineupRevisions ? 'View Less' : 'View More'}
                              </button>
                            </div>
                          ) : null}
                          {step.label === 'Folio Creation' && issue.folioCreationRevisions?.length ? (
                            <div className="issue-progress-revisions">
                              {showFolioCreationRevisions && (
                                <div className="issue-progress-revision-list">
                                  {issue.folioCreationRevisions.map((revision, revisionIndex) => {
                                    const revisionStart = getValidDate(revision.startedAt);
                                    const revisionEnd = getValidDate(revision.completedAt);
                                    return (
                                      <div className="issue-progress-revision" key={revision.id}>
                                        <p className="issue-progress-revision-title">
                                          Revision {revisionIndex + 1}
                                        </p>
                                        <p className="issue-progress-revision-dates">
                                          <span>
                                            Start:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionStart)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            End:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionEnd)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            Duration:{' '}
                                            <span className="issue-progress-date-value">
                                              {getDurationLabel(revisionStart, revisionEnd)}
                                            </span>
                                          </span>
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <button
                                type="button"
                                className="issue-progress-revision-toggle"
                                onClick={() => setShowFolioCreationRevisions(prev => !prev)}
                              >
                                {showFolioCreationRevisions ? 'View Less' : 'View More'}
                              </button>
                            </div>
                          ) : null}
                          {step.label === 'Folio Preparation' && issue.folioPreparationRevisions?.length ? (
                            <div className="issue-progress-revisions">
                              {showFolioPreparationRevisions && (
                                <div className="issue-progress-revision-list">
                                  {issue.folioPreparationRevisions.map((revision, revisionIndex) => {
                                    const revisionStart = getValidDate(revision.startedAt);
                                    const revisionEnd = getValidDate(revision.completedAt);
                                    return (
                                      <div className="issue-progress-revision" key={revision.id}>
                                        <p className="issue-progress-revision-title">
                                          Revision {revisionIndex + 1}
                                        </p>
                                        <p className="issue-progress-revision-dates">
                                          <span>
                                            Start:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionStart)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            End:{' '}
                                            <span className="issue-progress-date-value">
                                              {formatDisplayDateTime(revisionEnd)}
                                            </span>
                                          </span>
                                          <span className="issue-progress-date-separator">|</span>
                                          <span>
                                            Duration:{' '}
                                            <span className="issue-progress-date-value">
                                              {getDurationLabel(revisionStart, revisionEnd)}
                                            </span>
                                          </span>
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <button
                                type="button"
                                className="issue-progress-revision-toggle"
                                onClick={() => setShowFolioPreparationRevisions(prev => !prev)}
                              >
                                {showFolioPreparationRevisions ? 'View Less' : 'View More'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
      <ArticleLineupModal
        isOpen={showLineupModal}
        issue={issue ?? null}
        onClose={() => setShowLineupModal(false)}
        onConfirm={handleConfirmLineup}
      />
      <EditIssueDetailsModal
        isOpen={showEditModal}
        issue={issue ?? null}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveIssueDetails}
      />
      <FolioArrangeModal
        isOpen={showFolioArrangeModal}
        issue={issue ?? null}
        onClose={() => setShowFolioArrangeModal(false)}
        onSave={handleSaveFolioArrangement}
      />
      <FolioReviewModal
        isOpen={showFolioReviewModal}
        issue={issue ?? null}
        onClose={() => setShowFolioReviewModal(false)}
        onApprove={handleApproveFolioReview}
        onCorrectionSubmit={handleSubmitFolioCorrection}
      />
    </div>
  );
};

export default IssueDetails;
