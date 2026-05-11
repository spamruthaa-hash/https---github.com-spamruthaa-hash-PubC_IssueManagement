import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArticleLineupModal from '../components/ArticleLineupModal';
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
import { formatDisplayDateTime } from '../utils/dateFormat';
import './MyTasks.css';

interface MyTasksProps {
  onLogout: () => void;
}

type TaskKind = 'article-lineup' | 'folio-creation' | 'folio-review';

interface IssueTask {
  id: string;
  issue: Issue;
  milestone: 'Article Lineup' | 'Folio Creation' | 'Folio Review';
  actionLabel: string;
  taskKind: TaskKind;
}

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  regular: 'Regular',
  special: 'Special',
};

const CURRENT_USER_NAME = 'John Doe';
const SYSTEM_USER_NAME = 'System';
const FOLIO_PREPARATION_DURATION_MS = 10 * 1000;
const PRINT_DURATION_MS = 10 * 1000;
const ONLINE_PUBLICATION_DURATION_MS = 10 * 1000;

const getValidDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

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

const getIssueTask = (issue: Issue): IssueTask | null => {
  if (issue.status === 'completed') return null;

  if (issue.milestone === 'Article Lineup') {
    return {
      id: `${issue.id}-article-lineup`,
      issue,
      milestone: 'Article Lineup',
      actionLabel: issue.assignedArticleIds.length > 0 ? 'Confirm' : 'Create',
      taskKind: 'article-lineup',
    };
  }

  if (issue.milestone === 'Folio Creation') {
    return {
      id: `${issue.id}-folio-creation`,
      issue,
      milestone: 'Folio Creation',
      actionLabel: 'Arrange Folio',
      taskKind: 'folio-creation',
    };
  }

  if (issue.milestone === 'Final Review') {
    return {
      id: `${issue.id}-folio-review`,
      issue,
      milestone: 'Folio Review',
      actionLabel: 'Review',
      taskKind: 'folio-review',
    };
  }

  return null;
};

const MilestoneBadge = ({ milestone }: { milestone: IssueTask['milestone'] }) => (
  <span className="my-tasks-milestone-badge">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.48 10.68a5.4 5.4 0 0 1-.89-1.45 5.6 5.6 0 0 1-.42-1.65h1.19c.06.42.16.82.32 1.2.16.39.36.75.62 1.08l-.82.82ZM1.17 6.42c.08-.58.23-1.13.44-1.65.21-.53.5-1.01.87-1.45l.82.82c-.26.33-.46.69-.62 1.07-.16.39-.26.79-.32 1.21H1.17Zm5.22 6.38c-.58-.06-1.12-.2-1.64-.42a5.4 5.4 0 0 1-1.45-.86l.81-.85c.34.26.7.47 1.08.63.38.17.78.28 1.2.34v1.16Zm-2.25-9.47-.84-.85c.45-.36.94-.65 1.47-.87.52-.22 1.07-.35 1.65-.41v1.16c-.42.06-.82.17-1.2.34-.39.16-.75.37-1.08.63Zm3.41 9.47v-1.16c.43-.06.84-.17 1.22-.33.38-.16.75-.37 1.09-.63l.84.84c-.45.37-.95.66-1.48.88-.53.21-1.08.35-1.67.4Zm2.34-9.47a4.1 4.1 0 0 0-1.1-.63 4.2 4.2 0 0 0-1.2-.34V1.2c.57.06 1.12.19 1.65.41.53.22 1.02.51 1.47.87l-.82.85Zm1.63 7.35-.82-.82c.26-.33.46-.69.62-1.08.16-.38.26-.78.32-1.2h1.19c-.08.58-.22 1.13-.44 1.65-.21.52-.5 1-.87 1.45Zm.12-4.26c-.06-.42-.16-.82-.32-1.21-.16-.38-.36-.74-.62-1.07l.82-.82c.37.44.66.92.89 1.45.22.52.36 1.07.44 1.65h-1.21Z"
        fill="currentColor"
      />
    </svg>
    {milestone}
  </span>
);

const MyTasks = ({ onLogout }: MyTasksProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [journalFilter, setJournalFilter] = useState('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | 'all'>('all');
  const [activeTask, setActiveTask] = useState<IssueTask | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const navigate = useNavigate();
  const { issues, updateIssue } = useIssues();

  const tasks = useMemo(() => issues.map(getIssueTask).filter((task): task is IssueTask => task !== null), [issues]);

  const journalOptions = useMemo(() => {
    const journals = new Map<string, string>();
    tasks.forEach(task => {
      journals.set(task.issue.journalId, task.issue.journalAcronym);
    });
    return Array.from(journals.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ id, label }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter(task => {
      const { issue } = task;
      if (journalFilter !== 'all' && issue.journalId !== journalFilter) return false;
      if (issueTypeFilter !== 'all' && issue.issueType !== issueTypeFilter) return false;
      if (!query) return true;
      return [
        issue.journalAcronym,
        issue.volume,
        issue.issue,
        `${issue.volume}/${issue.issue}`,
        ISSUE_TYPE_LABEL[issue.issueType],
        task.milestone,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [issueTypeFilter, journalFilter, search, tasks]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleAction = (task: IssueTask) => {
    setActiveTask(task);
  };

  const closeTaskModal = () => setActiveTask(null);
  const dismissToast = () => setToast(null);
  const activeIssue = activeTask ? issues.find(issue => issue.id === activeTask.issue.id) ?? null : null;

  useEffect(() => {
    const timeoutIds = issues.flatMap(issue => {
      if (
        issue.milestone === 'Folio Preparation'
        && issue.folioArrangementConfirmedAt
        && !issue.folioPreparationConfirmedAt
      ) {
        const startedAt = getValidDate(issue.folioPreparationStartedAt ?? issue.folioArrangementConfirmedAt).getTime();
        const completesAt = startedAt + FOLIO_PREPARATION_DURATION_MS;
        const timeoutId = window.setTimeout(() => {
          updateIssue(issue.id, {
            folioPreparationConfirmedAt: new Date(completesAt).toISOString(),
            folioPreparationConfirmedBy: SYSTEM_USER_NAME,
            milestone: 'Final Review',
          });
        }, Math.max(0, completesAt - Date.now()));
        return [timeoutId];
      }

      if (
        issue.milestone === 'Print'
        && issue.folioReviewConfirmedAt
        && !issue.printConfirmedAt
      ) {
        const startedAt = getValidDate(issue.folioReviewConfirmedAt).getTime();
        const completesAt = startedAt + PRINT_DURATION_MS;
        const timeoutId = window.setTimeout(() => {
          const isPrintOnly = issue.outputFormat === 'print';
          updateIssue(issue.id, {
            printConfirmedAt: new Date(completesAt).toISOString(),
            printConfirmedBy: SYSTEM_USER_NAME,
            milestone: getMilestoneAfterPrint(issue.outputFormat),
            status: isPrintOnly ? 'completed' : 'in-progress',
          });
        }, Math.max(0, completesAt - Date.now()));
        return [timeoutId];
      }

      if (
        issue.milestone === 'Online Publication'
        && !issue.onlinePublicationConfirmedAt
      ) {
        const onlineStartedAt = issue.printConfirmedAt ?? issue.folioReviewConfirmedAt;
        if (!onlineStartedAt) return [];

        const startedAt = getValidDate(onlineStartedAt).getTime();
        const completesAt = startedAt + ONLINE_PUBLICATION_DURATION_MS;
        const timeoutId = window.setTimeout(() => {
          updateIssue(issue.id, {
            onlinePublicationConfirmedAt: new Date(completesAt).toISOString(),
            onlinePublicationConfirmedBy: SYSTEM_USER_NAME,
            milestone: 'Online Publication',
            status: 'completed',
          });
        }, Math.max(0, completesAt - Date.now()));
        return [timeoutId];
      }

      return [];
    });

    return () => timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
  }, [issues, updateIssue]);

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
    closeTaskModal();
    setToast({
      id: `my-task-folio-restarted-${Date.now()}`,
      variant: 'success',
      message,
    });
  };

  const handleConfirmLineup = (id: string, articleIds: string[]) => {
    if (articleIds.length === 0) return;

    const currentIssue = issues.find(issue => issue.id === id);
    const confirmedAt = new Date().toISOString();
    updateIssue(id, {
      assignedArticleIds: articleIds,
      articleLineupStartedAt: confirmedAt,
      articleLineupRevisions: currentIssue ? getArticleLineupRevisions(currentIssue, confirmedAt) : [],
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
    closeTaskModal();
    setToast({
      id: `my-task-lineup-confirmed-${Date.now()}`,
      variant: 'success',
      message: 'Article lineup confirmed successfully.',
    });
  };

  const handleSaveFolioArrangement = (id: string, arrangement: FolioArrangement) => {
    const currentIssue = issues.find(issue => issue.id === id);
    updateIssue(id, {
      folioArrangement: arrangement,
      folioCreationRevisions: currentIssue ? getFolioCreationRevisions(currentIssue, arrangement.submittedAt) : [],
      folioArrangementConfirmedAt: arrangement.submittedAt,
      folioArrangementConfirmedBy: arrangement.submittedBy,
      folioPreparationStartedAt: arrangement.submittedAt,
      folioPreparationRevisions: currentIssue
        ? getFolioPreparationRevisions(currentIssue, 'folio-edit', arrangement.submittedAt)
        : [],
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
    closeTaskModal();
    setToast({
      id: `my-task-folio-arranged-${Date.now()}`,
      variant: 'success',
      message: 'Folio creation completed successfully',
    });
  };

  const handleApproveFolioReview = () => {
    if (!activeIssue) return;

    const reviewedAt = new Date().toISOString();
    if (activeIssue.folioReviewConfirmedAt) {
      restartFolioPreparation(
        activeIssue,
        're-review',
        reviewedAt,
        'Re-review submitted. Folio preparation restarted.',
      );
      return;
    }

    updateIssue(activeIssue.id, {
      folioReviewConfirmedAt: reviewedAt,
      folioReviewConfirmedBy: CURRENT_USER_NAME,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: getNextMilestoneAfterFolioReview(activeIssue.outputFormat),
    });
    closeTaskModal();
    setToast({
      id: `my-task-folio-reviewed-${Date.now()}`,
      variant: 'success',
      message: 'Folio review approved successfully.',
    });
  };

  const handleSubmitFolioCorrection = () => {
    if (!activeIssue) return;

    restartFolioPreparation(
      activeIssue,
      'correction',
      new Date().toISOString(),
      'Correction uploaded. Folio preparation restarted.',
    );
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarCollapsed(prev => !prev)} onLogout={handleLogout} />

      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />

        <main className="dashboard-main">
          <div className="my-tasks-page">
            <header className="my-tasks-header">
              <h1>
                My Tasks
                <span className="my-tasks-info" aria-label="Tasks that need your response">i</span>
              </h1>
            </header>

            <div className="my-tasks-toolbar">
              <label className="my-tasks-search">
                <span className="visually-hidden">Search tasks</span>
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
                    fill="#35424d"
                  />
                </svg>
              </label>

              <div className="my-tasks-filters">
                <label>
                  <strong>Journal:</strong>
                  <select value={journalFilter} onChange={event => setJournalFilter(event.target.value)}>
                    <option value="all">All</option>
                    {journalOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <strong>Issue Type:</strong>
                  <select
                    value={issueTypeFilter}
                    onChange={event => setIssueTypeFilter(event.target.value as IssueType | 'all')}
                  >
                    <option value="all">All</option>
                    <option value="regular">Regular</option>
                    <option value="special">Special</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="my-tasks-table-wrap">
              <table className="my-tasks-table">
                <thead>
                  <tr>
                    <th>Journal</th>
                    <th>Volume/Issue</th>
                    <th>Issue Type</th>
                    <th>Assigned Articles</th>
                    <th>Milestone</th>
                    <th>Estimated Publication</th>
                    <th aria-label="Task action" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="my-tasks-empty">
                        No tasks need your response right now.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => (
                      <tr key={task.id}>
                        <td>{task.issue.journalAcronym}</td>
                        <td>{task.issue.volume}/{task.issue.issue}</td>
                        <td>{ISSUE_TYPE_LABEL[task.issue.issueType]}</td>
                        <td>{task.issue.assignedArticleIds.length}</td>
                        <td><MilestoneBadge milestone={task.milestone} /></td>
                        <td>{formatDisplayDateTime(task.issue.publicationDate)}</td>
                        <td>
                          <button
                            type="button"
                            className="my-tasks-action"
                            onClick={() => handleAction(task)}
                          >
                            {task.actionLabel}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <Toast toast={toast} onDismiss={dismissToast} />
      <ArticleLineupModal
        isOpen={activeTask?.taskKind === 'article-lineup'}
        issue={activeIssue}
        onClose={closeTaskModal}
        onConfirm={handleConfirmLineup}
      />
      <FolioArrangeModal
        isOpen={activeTask?.taskKind === 'folio-creation'}
        issue={activeIssue}
        onClose={closeTaskModal}
        onSave={handleSaveFolioArrangement}
      />
      <FolioReviewModal
        isOpen={activeTask?.taskKind === 'folio-review'}
        issue={activeIssue}
        onClose={closeTaskModal}
        onApprove={handleApproveFolioReview}
        onCorrectionSubmit={handleSubmitFolioCorrection}
      />
    </div>
  );
};

export default MyTasks;
