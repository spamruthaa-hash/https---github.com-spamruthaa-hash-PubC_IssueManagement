import { useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import FilterDropdown from '../components/FilterDropdown';
import Header from '../components/Header';

import ArticleLineupModal from '../components/ArticleLineupModal';
import EditIssueDetailsModal from '../components/EditIssueDetailsModal';
import FolioArrangeModal from '../components/FolioArrangeModal';
import FolioReviewModal from '../components/FolioReviewModal';
import ScheduleMilestoneBar, { type ScheduleMilestoneTone } from '../components/ScheduleMilestoneBar';
import ScheduleMilestoneDetailModal from '../components/ScheduleMilestoneDetailModal';
import ScheduleMilestoneTooltip from '../components/ScheduleMilestoneTooltip';
import Toast, { type ToastData } from '../components/Toast';
import type {
  ArticleLineupRevision,
  FolioArrangement,
  FolioCreationRevision,
  FolioPreparationRevision,
  FolioPreparationRevisionReason,
  Issue,
  IssueOutputFormat,
} from '../types/issue';

import Sidebar from '../components/Sidebar';

import { getCombinedScheduleEntries } from '../data/mockScheduleEntries';

import { JOURNALS } from '../data/journals';

import { useIssues } from '../hooks/useIssues';
import { useJournalSchedules } from '../hooks/useJournalSchedules';

import type { ScheduledIssueEntry, ScheduleIssueType } from '../types/schedule';

import {
  buildScheduleRowLayout,
  buildTimelineColumnsForRange,
  formatMilestoneRange,
  formatTimelineRangeLabel,
  getTimelineRangeBounds,
  getDatePositionInColumn,
  isColumnContainingDate,
  milestoneOverlapsTimelineRange,
  MONTH_COLUMN_MIN_PX,
  shiftTimelineAnchor,
  TIMELINE_RANGE_LABELS,
  TIMELINE_RANGE_OPTIONS,
  WEEK_COLUMN_MIN_PX,
  type ScheduleTimelineRange,
} from '../utils/scheduleCalendar';
import { getMockToday } from '../utils/mockToday';

import {
  getScheduleMilestoneStatusForEntry,
  resolveScheduleEntryDisplay,
  type ScheduleEntryDisplay,
} from '../utils/scheduleIssueSync';
import {
  buildScheduleMilestoneModalData,
  buildScheduleMilestoneTooltipData,
  type ScheduleMilestoneProgressActionKind,
} from '../utils/scheduleMilestoneModal';

import './IssueSchedule.css';



interface IssueScheduleProps {

  onLogout: () => void;

}



type IssueTypeFilter = 'all' | ScheduleIssueType;

type JournalFilter = 'all' | string;

type ScheduleSortId = 'publication-asc' | 'publication-desc';

const SCHEDULE_SORT_OPTIONS: { id: ScheduleSortId; label: string }[] = [
  { id: 'publication-asc', label: 'Est. Publication (Earliest First)' },
  { id: 'publication-desc', label: 'Est. Publication (Latest First)' },
];

const ISSUE_COL_WIDTH = 200;

const generateToastId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const CURRENT_USER_NAME = 'John Doe';

const getOffsetWithinAncestor = (element: HTMLElement, ancestor: HTMLElement) => {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;

  while (current && current !== ancestor) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return { left, top };
};

type ScheduleProgressModalKind = 'article-lineup' | 'folio-creation' | 'folio-review';

const getNextMilestoneAfterFolioReview = (outputFormat: IssueOutputFormat): Issue['milestone'] =>
  outputFormat === 'online' ? 'Online Publication' : 'Print';

const getArticleLineupRevisions = (issue: Issue, submittedAt: string): ArticleLineupRevision[] => {
  const completedAt = issue.articleLineupConfirmedAt;
  if (!completedAt) return issue.articleLineupRevisions ?? [];

  const revision: ArticleLineupRevision = {
    id: `article-lineup-${submittedAt}`,
    startedAt: issue.articleLineupStartedAt ?? issue.createdAt,
    completedAt,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
    articleCount: issue.assignedArticleIds.length,
  };

  return [...(issue.articleLineupRevisions ?? []), revision];
};

const getFolioCreationRevisions = (issue: Issue, submittedAt: string): FolioCreationRevision[] => {
  const completedAt = issue.folioArrangementConfirmedAt;
  if (!completedAt) return issue.folioCreationRevisions ?? [];

  const revision: FolioCreationRevision = {
    id: `folio-creation-${submittedAt}`,
    startedAt: issue.articleLineupConfirmedAt ?? issue.createdAt,
    completedAt,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
    itemCount: issue.folioArrangement?.items.length ?? 0,
  };

  return [...(issue.folioCreationRevisions ?? []), revision];
};

const getFolioPreparationRevisions = (
  issue: Issue,
  reason: FolioPreparationRevisionReason,
  submittedAt: string,
): FolioPreparationRevision[] => {
  const startedAt = issue.folioPreparationStartedAt ?? issue.folioArrangementConfirmedAt;
  if (!startedAt) return issue.folioPreparationRevisions ?? [];

  const revision: FolioPreparationRevision = {
    id: `${reason}-${submittedAt}`,
    startedAt,
    completedAt: issue.folioPreparationConfirmedAt ?? submittedAt,
    reason,
    submittedAt,
    submittedBy: CURRENT_USER_NAME,
  };

  return [...(issue.folioPreparationRevisions ?? []), revision];
};



const IssueSchedule = ({ onLogout }: IssueScheduleProps) => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [anchorMonth, setAnchorMonth] = useState(() => {
    const today = getMockToday();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [timelineRange, setTimelineRange] = useState<ScheduleTimelineRange>('month');

  const [sortBy, setSortBy] = useState<ScheduleSortId>('publication-asc');
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueTypeFilter>('all');

  const [milestonePopTarget, setMilestonePopTarget] = useState<{
    entry: ScheduleEntryDisplay;
    milestoneIndex: number;
    anchorEl: HTMLElement;
  } | null>(null);

  const [milestoneTooltipTarget, setMilestoneTooltipTarget] = useState<{
    entry: ScheduleEntryDisplay;
    milestoneIndex: number;
    anchorEl: HTMLElement;
  } | null>(null);

  const milestoneTooltipShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ganttInnerRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<HTMLDivElement>(null);
  const [nowMarkerLayout, setNowMarkerLayout] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [progressModalKind, setProgressModalKind] = useState<ScheduleProgressModalKind | null>(null);
  const [progressModalIssueId, setProgressModalIssueId] = useState<string | null>(null);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [editDetailsIssueId, setEditDetailsIssueId] = useState<string | null>(null);

  const navigate = useNavigate();

  const { schedules } = useJournalSchedules();

  const { issues, updateIssue } = useIssues();

  const allEntries = useMemo(
    () => getCombinedScheduleEntries(schedules, issues),
    [schedules, issues],
  );

  const timelineBounds = useMemo(
    () => getTimelineRangeBounds(anchorMonth, timelineRange),
    [anchorMonth, timelineRange],
  );

  const timelineColumns = useMemo(
    () => buildTimelineColumnsForRange(anchorMonth, timelineRange),
    [anchorMonth, timelineRange],
  );
  const useMonthColumns = timelineRange !== 'month';
  const highlightCurrentColumn = timelineRange === 'month';
  const columnMinPx = useMonthColumns ? MONTH_COLUMN_MIN_PX : WEEK_COLUMN_MIN_PX;
  const today = useMemo(() => getMockToday(), []);
  const isCurrentColumn = useCallback(
    (column: (typeof timelineColumns)[number]) => isColumnContainingDate(column, today),
    [today],
  );

  const currentTimeIndicator = useMemo(() => {
    const columnIndex = timelineColumns.findIndex(column => isColumnContainingDate(column, today));
    if (columnIndex < 0) return null;

    const column = timelineColumns[columnIndex];
    const position = getDatePositionInColumn(column, today);
    if (position === null) return null;

    return { columnIndex, position };
  }, [timelineColumns, today]);

  const updateNowMarkerLayout = useCallback(() => {
    if (!currentTimeIndicator || !ganttInnerRef.current || !ganttGridRef.current) {
      setNowMarkerLayout(null);
      return;
    }

    const inner = ganttInnerRef.current;
    const timelineHeaders = ganttGridRef.current.querySelectorAll<HTMLElement>(
      '.issue-schedule-gantt-header.issue-schedule-week-col, .issue-schedule-gantt-header.issue-schedule-month-col',
    );
    const header = timelineHeaders[currentTimeIndicator.columnIndex];
    if (!header) {
      setNowMarkerLayout(null);
      return;
    }

    const { left: headerLeft, top: headerTop } = getOffsetWithinAncestor(header, inner);
    const left = headerLeft + header.offsetWidth * currentTimeIndicator.position;
    const bodyTop = headerTop + header.offsetHeight;
    const bodyHeight = Math.max(inner.offsetHeight - bodyTop, 0);

    setNowMarkerLayout({ left, top: bodyTop, height: bodyHeight });
  }, [currentTimeIndicator]);

  const displayEntries = useMemo(
    () => allEntries.map(entry => resolveScheduleEntryDisplay(entry, issues)),
    [allEntries, issues],
  );

  const filteredEntries = useMemo(() => {
    const publicationDate = (entry: ScheduleEntryDisplay) =>
      entry.displayMilestones.find(m => m.kind === 'online-publication')?.startDate
      ?? entry.displayMilestones.find(m => m.kind === 'print-package')?.startDate
      ?? '';

    return displayEntries
      .filter(entry => {
        if (journalFilter !== 'all' && entry.journalId !== journalFilter) return false;
        if (issueTypeFilter !== 'all' && entry.issueType !== issueTypeFilter) return false;
        return entry.displayMilestones.some(milestone =>
          milestoneOverlapsTimelineRange(
            milestone.startDate,
            milestone.endDate,
            timelineBounds,
          ),
        );
      })
      .sort((a, b) => {
        const comparison = publicationDate(a).localeCompare(publicationDate(b));
        return sortBy === 'publication-desc' ? -comparison : comparison;
      });
  }, [displayEntries, journalFilter, issueTypeFilter, timelineBounds, sortBy]);

  useLayoutEffect(() => {
    updateNowMarkerLayout();
  }, [
    updateNowMarkerLayout,
    filteredEntries.length,
    timelineColumns,
    anchorMonth,
    timelineRange,
    useMonthColumns,
  ]);

  useLayoutEffect(() => {
    const inner = ganttInnerRef.current;
    const gantt = inner?.closest('.issue-schedule-gantt');
    if (!inner || !gantt) return undefined;

    const observer = new ResizeObserver(() => updateNowMarkerLayout());
    observer.observe(inner);
    observer.observe(gantt);

    gantt.addEventListener('scroll', updateNowMarkerLayout);
    window.addEventListener('resize', updateNowMarkerLayout);

    return () => {
      observer.disconnect();
      gantt.removeEventListener('scroll', updateNowMarkerLayout);
      window.removeEventListener('resize', updateNowMarkerLayout);
    };
  }, [updateNowMarkerLayout]);

  const sortDisplayLabel =
    SCHEDULE_SORT_OPTIONS.find(option => option.id === sortBy)?.label
    ?? SCHEDULE_SORT_OPTIONS[0].label;

  const journalOptions = useMemo(
    () => [
      { id: 'all', label: 'All' },
      ...JOURNALS.map(journal => ({ id: journal.id, label: journal.acronym })),
    ],
    [],
  );

  const journalFilterLabel =
    journalOptions.find(option => option.id === journalFilter)?.label ?? 'All';

  const issueTypeOptions = useMemo(
    () => [
      { id: 'all', label: 'All' },
      { id: 'regular', label: 'Regular' },
      { id: 'special', label: 'Special' },
    ],
    [],
  );

  const issueTypeLabel =
    issueTypeOptions.find(option => option.id === issueTypeFilter)?.label ?? 'All';

  const timelineOptions = useMemo(
    () =>
      TIMELINE_RANGE_OPTIONS.map(range => ({
        id: range,
        label: TIMELINE_RANGE_LABELS[range],
      })),
    [],
  );



  const gridTemplateColumns = `${ISSUE_COL_WIDTH}px repeat(${timelineColumns.length}, minmax(${columnMinPx}px, 1fr))`;
  const ganttMinWidth = ISSUE_COL_WIDTH + timelineColumns.length * columnMinPx;

  const milestonePopData = useMemo(
    () =>
      milestonePopTarget
        ? buildScheduleMilestoneModalData(
            milestonePopTarget.entry,
            milestonePopTarget.milestoneIndex,
          )
        : null,
    [milestonePopTarget],
  );

  const milestoneTooltipData = useMemo(
    () =>
      milestoneTooltipTarget
        ? buildScheduleMilestoneTooltipData(
            milestoneTooltipTarget.entry,
            milestoneTooltipTarget.milestoneIndex,
          )
        : null,
    [milestoneTooltipTarget],
  );

  const clearMilestoneTooltipTimers = useCallback(() => {
    if (milestoneTooltipShowTimer.current) {
      clearTimeout(milestoneTooltipShowTimer.current);
      milestoneTooltipShowTimer.current = null;
    }
    if (milestoneTooltipHideTimer.current) {
      clearTimeout(milestoneTooltipHideTimer.current);
      milestoneTooltipHideTimer.current = null;
    }
  }, []);

  const showMilestoneTooltip = useCallback(
    (entry: ScheduleEntryDisplay, milestoneIndex: number, anchorEl: HTMLElement) => {
      clearMilestoneTooltipTimers();
      milestoneTooltipShowTimer.current = setTimeout(() => {
        setMilestoneTooltipTarget({ entry, milestoneIndex, anchorEl });
      }, 200);
    },
    [clearMilestoneTooltipTimers],
  );

  const hideMilestoneTooltip = useCallback(() => {
    clearMilestoneTooltipTimers();
    milestoneTooltipHideTimer.current = setTimeout(() => {
      setMilestoneTooltipTarget(null);
    }, 80);
  }, [clearMilestoneTooltipTimers]);

  const openMilestonePopover = useCallback(
    (entry: ScheduleEntryDisplay, milestoneIndex: number, anchorEl: HTMLElement) => {
      clearMilestoneTooltipTimers();
      setMilestoneTooltipTarget(null);
      setMilestonePopTarget({ entry, milestoneIndex, anchorEl });
    },
    [clearMilestoneTooltipTimers],
  );

  const closeMilestonePopover = useCallback(() => {
    setMilestonePopTarget(null);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const progressModalIssue = useMemo(() => {
    if (!progressModalIssueId) return null;
    return issues.find(issue => issue.id === progressModalIssueId) ?? null;
  }, [issues, progressModalIssueId]);

  const editDetailsIssue = useMemo(() => {
    if (!editDetailsIssueId) return null;
    return issues.find(issue => issue.id === editDetailsIssueId) ?? null;
  }, [editDetailsIssueId, issues]);

  const closeProgressModal = useCallback(() => {
    setProgressModalKind(null);
    setProgressModalIssueId(null);
  }, []);

  const restartFolioPreparation = useCallback(
    (
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
      closeProgressModal();
      setToast({
        id: generateToastId(),
        variant: 'success',
        message,
      });
    },
    [closeProgressModal, updateIssue],
  );

  const handleConfirmLineup = useCallback(
    (id: string, articleIds: string[]) => {
      if (articleIds.length === 0) return;

      const currentIssue = issues.find(issue => issue.id === id);
      const confirmedAt = new Date().toISOString();

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
      closeProgressModal();
      setToast({
        id: generateToastId(),
        variant: 'success',
        message: 'Article lineup confirmed successfully.',
      });
    },
    [closeProgressModal, issues, updateIssue],
  );

  const handleSaveFolioArrangement = useCallback(
    (id: string, arrangement: FolioArrangement) => {
      const currentIssue = issues.find(issue => issue.id === id);

      updateIssue(id, {
        folioArrangement: arrangement,
        folioCreationRevisions: currentIssue
          ? getFolioCreationRevisions(currentIssue, arrangement.submittedAt)
          : [],
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
      closeProgressModal();
      setToast({
        id: generateToastId(),
        variant: 'success',
        message: 'Folio creation completed successfully',
      });
    },
    [closeProgressModal, issues, updateIssue],
  );

  const handleApproveFolioReview = useCallback(() => {
    if (!progressModalIssue) return;

    const reviewedAt = new Date().toISOString();
    if (progressModalIssue.folioReviewConfirmedAt) {
      restartFolioPreparation(
        progressModalIssue,
        're-review',
        reviewedAt,
        'Re-review submitted. Folio preparation restarted.',
      );
      return;
    }

    updateIssue(progressModalIssue.id, {
      folioReviewConfirmedAt: reviewedAt,
      folioReviewConfirmedBy: CURRENT_USER_NAME,
      printConfirmedAt: undefined,
      printConfirmedBy: undefined,
      onlinePublicationConfirmedAt: undefined,
      onlinePublicationConfirmedBy: undefined,
      milestone: getNextMilestoneAfterFolioReview(progressModalIssue.outputFormat),
    });
    closeProgressModal();
    setToast({
      id: generateToastId(),
      variant: 'success',
      message: 'Folio review approved successfully.',
    });
  }, [closeProgressModal, progressModalIssue, restartFolioPreparation, updateIssue]);

  const handleSubmitFolioCorrection = useCallback(() => {
    if (!progressModalIssue) return;

    restartFolioPreparation(
      progressModalIssue,
      'correction',
      new Date().toISOString(),
      'Correction uploaded. Folio preparation restarted.',
    );
  }, [progressModalIssue, restartFolioPreparation]);

  const handleOpenEditDetails = useCallback(() => {
    const issueId = milestonePopTarget?.entry.linkedIssue?.id;
    if (!issueId) return;
    setEditDetailsIssueId(issueId);
    setMilestonePopTarget(null);
    setShowEditIssueModal(true);
  }, [milestonePopTarget]);

  const handleSaveIssueDetails = useCallback(
    (id: string, updates: Partial<Issue>) => {
      updateIssue(id, updates);
      setShowEditIssueModal(false);
      setEditDetailsIssueId(null);
      setToast({
        id: generateToastId(),
        variant: 'success',
        message: 'Issue details updated successfully.',
      });
    },
    [updateIssue],
  );

  const handleProgressAction = useCallback(
    (kind: ScheduleMilestoneProgressActionKind) => {
      const modalKind: ScheduleProgressModalKind =
        kind === 'folio-arrangement' ? 'folio-creation' : kind;
      const issueId = milestonePopTarget?.entry.linkedIssue?.id ?? null;
      setMilestonePopTarget(null);
      setProgressModalIssueId(issueId);
      setProgressModalKind(modalKind);
    },
    [milestonePopTarget],
  );

  const showDragNotAllowedToast = useCallback(
    (
      entry: ScheduleEntryDisplay,
      milestoneIndex: number,
      anchorEl: HTMLElement,
    ) => {
      setToast({
        id: generateToastId(),
        variant: 'info',
        message: "Milestones can't be moved by drag and drop on the schedule.",
        durationMs: 6000,
        action: {
          label: 'Edit details',
          onClick: () => {
            openMilestonePopover(entry, milestoneIndex, anchorEl);
          },
        },
      });
    },
    [openMilestonePopover],
  );

  const handleLogout = () => {

    onLogout();

    navigate('/login');

  };



  const getMilestoneTone = (entry: ScheduledIssueEntry): ScheduleMilestoneTone =>
    entry.issueType === 'special' ? 'special' : 'regular';



  return (

    <div className="dashboard-container">

      <Header onMenuClick={() => setSidebarCollapsed(prev => !prev)} onLogout={handleLogout} />



      <div className="dashboard-layout">

        <Sidebar isCollapsed={sidebarCollapsed} />



        <main className={`dashboard-main${sidebarCollapsed ? ' dashboard-main--sidebar-collapsed' : ''}`}>

          <div className="issue-schedule-page">

            <div className="issue-schedule-breadcrumb-bar">

              <div className="issue-schedule-breadcrumb">

                <ul className="issue-schedule-breadcrumb-trail">

                  <li>

                    <button type="button" onClick={() => navigate('/issues')}>

                      Issue In progress

                    </button>

                  </li>

                  <li aria-hidden>&gt;</li>

                </ul>

                <h1 className="issue-schedule-title">Schedule</h1>

              </div>

              <button

                type="button"

                className="issue-schedule-new-button"

                onClick={() => navigate('/issues')}

              >

                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>

                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />

                </svg>

                New Schedule

              </button>

            </div>



            <div className="issue-schedule-toolbar">

              <div className="issue-schedule-month-nav">

                <button

                  type="button"

                  className="issue-schedule-icon-button"

                  aria-label="Previous period"

                  onClick={() => setAnchorMonth(prev => shiftTimelineAnchor(prev, timelineRange, -1))}

                >

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>

                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                  </svg>

                </button>

                <p className="issue-schedule-month-label">
                  {formatTimelineRangeLabel(anchorMonth, timelineRange)}
                </p>

                <button

                  type="button"

                  className="issue-schedule-icon-button"

                  aria-label="Next period"

                  onClick={() => setAnchorMonth(prev => shiftTimelineAnchor(prev, timelineRange, 1))}

                >

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>

                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                  </svg>

                </button>

              </div>



              <div className="issue-schedule-filters">
                <FilterDropdown
                  label="Sort by"
                  value={sortBy}
                  displayValue={sortDisplayLabel}
                  options={SCHEDULE_SORT_OPTIONS}
                  onSelect={id => setSortBy(id as ScheduleSortId)}
                />
                <FilterDropdown
                  label="Journal"
                  value={journalFilter}
                  displayValue={journalFilterLabel}
                  options={journalOptions}
                  onSelect={id => setJournalFilter(id as JournalFilter)}
                />
                <FilterDropdown
                  label="Issue Type"
                  value={issueTypeFilter}
                  displayValue={issueTypeLabel}
                  options={issueTypeOptions}
                  onSelect={id => setIssueTypeFilter(id as IssueTypeFilter)}
                  alignRight
                />
                <FilterDropdown
                  label="Timeline"
                  value={timelineRange}
                  displayValue={TIMELINE_RANGE_LABELS[timelineRange]}
                  options={timelineOptions}
                  onSelect={id => setTimelineRange(id as ScheduleTimelineRange)}
                  alignRight
                />
              </div>

            </div>



            {filteredEntries.length === 0 && !currentTimeIndicator ? (

              <p className="issue-schedule-empty">

                No schedule entries yet. Upload a schedule from the Issues page to see milestones here.

              </p>

            ) : (

              <div className="issue-schedule-gantt">

                <div
                  ref={ganttInnerRef}
                  className="issue-schedule-gantt-inner"
                  style={{ minWidth: ganttMinWidth }}
                >
                <div
                  ref={ganttGridRef}
                  className={[
                    'issue-schedule-gantt-grid',
                    useMonthColumns ? 'issue-schedule-gantt-grid--months' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ gridTemplateColumns, minWidth: ganttMinWidth }}
                >

                  <div className="issue-schedule-gantt-header issue-schedule-issue-col">Issue</div>

                  {timelineColumns.map(column => (
                    <div
                      key={column.id}
                      className={[
                        'issue-schedule-gantt-header',
                        useMonthColumns ? 'issue-schedule-month-col' : 'issue-schedule-week-col',
                        highlightCurrentColumn && isCurrentColumn(column)
                          ? 'issue-schedule-week-col--current'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-current={
                        highlightCurrentColumn && isCurrentColumn(column) ? 'date' : undefined
                      }
                    >
                      {column.label}
                    </div>
                  ))}



                  {filteredEntries.map(entry => {
                    const issueLabel = `${entry.journalAcronym} - ${entry.volume}/${entry.issue}`;
                    const rowLayout = buildScheduleRowLayout(entry.displayMilestones, timelineColumns);
                    const { isStacked, rowHeight, items: milestoneItems } = rowLayout;
                    const columnWidth = 100 / timelineColumns.length;

                    return (
                      <div key={entry.id} className="issue-schedule-gantt-row">
                        <div
                          className="issue-schedule-issue-cell"
                          style={{ minHeight: rowHeight }}
                        >
                          <div className="issue-schedule-issue-cell-inner">
                            {entry.linkedIssue ? (
                              <button
                                type="button"
                                className="issue-schedule-issue-link"
                                onClick={() => navigate(`/issues/${entry.linkedIssue!.id}`)}
                              >
                                {issueLabel}
                              </button>
                            ) : (
                              <p className="issue-schedule-issue-label">{issueLabel}</p>
                            )}
                            <button
                              type="button"
                              className="issue-schedule-icon-button issue-schedule-row-menu"
                              aria-label="Issue actions"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>
                          </div>
                        </div>



                        <div

                          className="issue-schedule-timeline"

                          style={{

                            gridColumn: `2 / -1`,

                            gridTemplateColumns: `repeat(${timelineColumns.length}, minmax(${columnMinPx}px, 1fr))`,

                            minHeight: rowHeight,

                          }}

                        >

                          {timelineColumns.map(column => (
                            <div
                              key={`${entry.id}-${column.id}`}
                              className={[
                                'issue-schedule-timeline-week',
                                highlightCurrentColumn && isCurrentColumn(column)
                                  ? 'issue-schedule-timeline-week--current'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            />
                          ))}



                          {milestoneItems.map(item => {
                            const milestone = entry.displayMilestones[item.milestoneIndex];
                            const tone = getMilestoneTone(entry);
                            const badgeStatus = getScheduleMilestoneStatusForEntry(
                              entry.displayMilestones,
                              item.milestoneIndex,
                              entry.linkedIssue,
                            );
                            const leftPercent = item.placement.startColumn * columnWidth;

                            const widthPercent = item.placement.span * columnWidth;
                            const isMilestoneSelected =
                              milestonePopTarget?.entry.id === entry.id
                              && milestonePopTarget.milestoneIndex === item.milestoneIndex;

                            return (

                              <div

                                key={`${entry.id}-${milestone.kind}`}

                                className={[
                                  'issue-schedule-milestone-slot',
                                  isStacked ? 'issue-schedule-milestone-slot--stacked' : '',
                                  isMilestoneSelected ? 'issue-schedule-milestone-slot--active' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}

                                style={{

                                  left: `calc(${leftPercent}% + 4px)`,

                                  width: `calc(${widthPercent}% - 8px)`,

                                  top: `${item.topPx}px`,

                                }}

                                onMouseEnter={e => {
                                  const bar = e.currentTarget.querySelector('button.schedule-milestone-bar');
                                  showMilestoneTooltip(
                                    entry,
                                    item.milestoneIndex,
                                    (bar ?? e.currentTarget) as HTMLElement,
                                  );
                                }}

                                onMouseLeave={hideMilestoneTooltip}

                              >

                                <ScheduleMilestoneBar

                                  label={milestone.label}

                                  dateRange={formatMilestoneRange(

                                    milestone.startDate,

                                    milestone.endDate,

                                  )}

                                  tone={tone}

                                  badgeVariant={badgeStatus}

                                  layout={item.layout}

                                  isSelected={isMilestoneSelected}

                                  onClick={e => {
                                    e.stopPropagation();
                                    const slot = e.currentTarget.closest(
                                      '.issue-schedule-milestone-slot',
                                    ) as HTMLElement | null;
                                    const bar = (slot ?? e.currentTarget).querySelector(
                                      'button.schedule-milestone-bar',
                                    ) as HTMLElement | null;
                                    openMilestonePopover(
                                      entry,
                                      item.milestoneIndex,
                                      bar ?? slot ?? e.currentTarget,
                                    );
                                  }}

                                  onDragAttempt={barEl => {
                                    const slot = barEl.closest(
                                      '.issue-schedule-milestone-slot',
                                    ) as HTMLElement | null;
                                    showDragNotAllowedToast(
                                      entry,
                                      item.milestoneIndex,
                                      slot ?? barEl,
                                    );
                                  }}

                                />

                              </div>

                            );

                          })}

                        </div>

                      </div>

                    );

                  })}

                </div>

                {currentTimeIndicator && nowMarkerLayout && (
                  <div
                    className="issue-schedule-now-indicator"
                    role="presentation"
                    aria-hidden
                    style={{
                      left: nowMarkerLayout.left,
                      top: nowMarkerLayout.top,
                      height: nowMarkerLayout.height,
                    }}
                  >
                    <span className="issue-schedule-now-indicator__line" />
                  </div>
                )}

                </div>

              </div>

            )}

          </div>

        </main>

      </div>

      <ScheduleMilestoneTooltip
        isOpen={milestoneTooltipTarget !== null && milestonePopTarget === null}
        data={milestoneTooltipData}
        anchorEl={milestoneTooltipTarget?.anchorEl ?? null}
      />

      <ScheduleMilestoneDetailModal
        isOpen={milestonePopTarget !== null}
        data={milestonePopData}
        anchorEl={milestonePopTarget?.anchorEl ?? null}
        onClose={closeMilestonePopover}
        onEditDetails={handleOpenEditDetails}
        onProgressAction={handleProgressAction}
      />

      <EditIssueDetailsModal
        isOpen={showEditIssueModal}
        issue={editDetailsIssue}
        onClose={() => {
          setShowEditIssueModal(false);
          setEditDetailsIssueId(null);
        }}
        onSave={handleSaveIssueDetails}
      />

      <ArticleLineupModal
        isOpen={progressModalKind === 'article-lineup'}
        issue={progressModalIssue}
        onClose={closeProgressModal}
        onConfirm={handleConfirmLineup}
      />
      <FolioArrangeModal
        isOpen={progressModalKind === 'folio-creation'}
        issue={progressModalIssue}
        onClose={closeProgressModal}
        onSave={handleSaveFolioArrangement}
      />
      <FolioReviewModal
        isOpen={progressModalKind === 'folio-review'}
        issue={progressModalIssue}
        onClose={closeProgressModal}
        onApprove={handleApproveFolioReview}
        onCorrectionSubmit={handleSubmitFolioCorrection}
      />

      <Toast toast={toast} onDismiss={dismissToast} />

    </div>

  );

};



export default IssueSchedule;

