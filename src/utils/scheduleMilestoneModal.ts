import type { Issue } from '../types/issue';
import type { ScheduleMilestoneKind } from '../types/schedule';
import { JOURNALS } from '../data/journals';
import { formatDisplayDate, formatDisplayDateTime } from './dateFormat';
import { getMockToday } from './mockToday';
import { formatMilestoneRange } from './scheduleCalendar';
import type { MilestoneBadgeStatus } from './scheduleMilestoneStatus';
import {
  getScheduleMilestoneStatusForEntry,
  type ScheduleEntryDisplay,
} from './scheduleIssueSync';

const ISSUE_TYPE_LABEL = { regular: 'Regular', special: 'Special' } as const;

const MILESTONE_STATUS_LABEL: Record<MilestoneBadgeStatus, string> = {
  'in-progress': 'In Progress',
  completed: 'Completed',
  'not-started': 'Not Started',
};

export interface ScheduleMilestoneTooltipData {
  issueLine: string;
  milestoneLine: string;
  dateRange: string;
  issueCloseDate: string;
  publicationDate: string;
}

const OUTPUT_FORMAT_LABEL = {
  print: 'Print',
  online: 'Online',
  both: 'Print & Online',
} as const;

const parseScheduleDate = (iso: string): Date => new Date(`${iso}T11:00:00`);

const getDurationLabel = (start: Date, end: Date): string => {
  const ms = Math.max(0, end.getTime() - start.getTime());
  const day = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.round(ms / day));
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
};

const getMilestoneConfirmation = (
  issue: Issue,
  kind: ScheduleMilestoneKind,
): { confirmedAt?: string; confirmedBy?: string } => {
  switch (kind) {
    case 'article-lineup':
      return {
        confirmedAt: issue.articleLineupConfirmedAt,
        confirmedBy: issue.articleLineupConfirmedBy,
      };
    case 'folio-creation':
      return {
        confirmedAt: issue.folioArrangementConfirmedAt,
        confirmedBy: issue.folioArrangementConfirmedBy,
      };
    case 'folio-preparation':
      return {
        confirmedAt: issue.folioPreparationConfirmedAt,
        confirmedBy: issue.folioPreparationConfirmedBy,
      };
    case 'folio-review':
      return {
        confirmedAt: issue.folioReviewConfirmedAt,
        confirmedBy: issue.folioReviewConfirmedBy,
      };
    case 'print-package':
      return { confirmedAt: issue.printConfirmedAt, confirmedBy: issue.printConfirmedBy };
    case 'online-publication':
      return {
        confirmedAt: issue.onlinePublicationConfirmedAt,
        confirmedBy: issue.onlinePublicationConfirmedBy,
      };
    default:
      return {};
  }
};

export type ScheduleMilestoneProgressActionKind =
  | 'article-lineup'
  | 'folio-arrangement'
  | 'folio-review';

export interface ScheduleMilestoneProgressAction {
  kind: ScheduleMilestoneProgressActionKind;
  label: string;
  variant: 'primary' | 'edit';
}

/**
 * Progress CTA rules mirror Issue Details — driven by live issue workflow,
 * not schedule bar badge dates (bars can show "completed" before work is done).
 */
const getScheduleMilestoneProgressAction = (
  issue: Issue | undefined,
  kind: ScheduleMilestoneKind,
): ScheduleMilestoneProgressAction | undefined => {
  if (!issue || issue.status === 'completed') return undefined;

  switch (kind) {
    case 'article-lineup':
      if (issue.articleLineupConfirmedAt) {
        return { kind: 'article-lineup', label: 'Edit', variant: 'edit' };
      }
      if (issue.milestone === 'Article Lineup') {
        return {
          kind: 'article-lineup',
          label: issue.assignedArticleIds.length > 0 ? 'Confirm' : 'Create',
          variant: 'primary',
        };
      }
      return undefined;

    case 'folio-creation':
      if (issue.folioArrangementConfirmedAt) {
        return { kind: 'folio-arrangement', label: 'Edit', variant: 'edit' };
      }
      if (issue.milestone === 'Folio Creation') {
        return { kind: 'folio-arrangement', label: 'Arrange', variant: 'primary' };
      }
      return undefined;

    case 'folio-preparation':
    case 'print-package':
    case 'online-publication':
    case 'issue-creation':
      return undefined;

    case 'folio-review':
      if (issue.folioReviewConfirmedAt) {
        return { kind: 'folio-review', label: 'Edit', variant: 'edit' };
      }
      if (issue.milestone === 'Final Review') {
        return { kind: 'folio-review', label: 'Approve', variant: 'primary' };
      }
      return undefined;

    default:
      return undefined;
  }
};

export interface ScheduleMilestoneModalData {
  issueLabel: string;
  canNavigateToIssue: boolean;
  issueId?: string;
  details: {
    type: string;
    coverMonth: string;
    assignedArticles: number;
    issueCloseDate: string;
    outputFormat: string;
    onlinePubDate: string;
  };
  progress: {
    milestoneLabel: string;
    badgeStatus: MilestoneBadgeStatus;
    startLabel?: string;
    startValue?: string;
    endLabel?: string;
    endValue?: string;
    estCompletion?: string;
    duration?: string;
    confirmedBy?: string;
    confirmedAt?: string;
  };
  progressAction?: ScheduleMilestoneProgressAction;
}

export const buildScheduleMilestoneModalData = (
  entry: ScheduleEntryDisplay,
  milestoneIndex: number,
  referenceDate: Date = getMockToday(),
): ScheduleMilestoneModalData | null => {
  const milestone = entry.displayMilestones[milestoneIndex];
  if (!milestone) return null;

  const issue = entry.linkedIssue;
  const issueLabel = `${entry.journalAcronym} - ${entry.volume}/${entry.issue}`;
  const publicationMilestone = entry.displayMilestones.find(m => m.kind === 'online-publication')
    ?? entry.displayMilestones.find(m => m.kind === 'print-package');

  const badgeStatus = getScheduleMilestoneStatusForEntry(
    entry.displayMilestones,
    milestoneIndex,
    issue,
    referenceDate,
  );

  const startIso = `${milestone.startDate}T11:00:00`;
  const endIso = `${milestone.endDate}T11:00:00`;
  const endDate = parseScheduleDate(milestone.endDate);

  const confirmation = issue ? getMilestoneConfirmation(issue, milestone.kind) : {};

  const progress: ScheduleMilestoneModalData['progress'] = {
    milestoneLabel: milestone.label,
    badgeStatus,
  };

  if (badgeStatus === 'completed') {
    const completedAt = confirmation.confirmedAt ?? endIso;
    progress.startLabel = 'Start';
    progress.startValue = formatDisplayDateTime(startIso);
    progress.endLabel = 'End';
    progress.endValue = formatDisplayDateTime(completedAt);
    progress.duration = getDurationLabel(
      parseScheduleDate(milestone.startDate),
      confirmation.confirmedAt ? new Date(confirmation.confirmedAt) : endDate,
    );
    if (confirmation.confirmedBy && confirmation.confirmedAt) {
      progress.confirmedBy = confirmation.confirmedBy;
      progress.confirmedAt = formatDisplayDateTime(confirmation.confirmedAt);
    }
  } else if (badgeStatus === 'in-progress') {
    progress.startLabel = 'Start';
    progress.startValue = formatDisplayDateTime(startIso);
    progress.endLabel = 'Est. Completion';
    progress.endValue = formatDisplayDateTime(endIso);
  } else {
    progress.estCompletion = formatDisplayDateTime(endIso);
  }

  const progressAction = getScheduleMilestoneProgressAction(issue, milestone.kind);

  return {
    issueLabel,
    canNavigateToIssue: Boolean(issue?.id),
    issueId: issue?.id,
    details: {
      type: ISSUE_TYPE_LABEL[entry.issueType],
      coverMonth: issue?.coverMonth || publicationMilestone?.startDate.slice(0, 7) || '—',
      assignedArticles: issue?.assignedArticleIds.length ?? 0,
      issueCloseDate: formatDisplayDate(issue?.issueCloseDate ?? milestone.startDate),
      outputFormat: OUTPUT_FORMAT_LABEL[entry.outputFormat],
      onlinePubDate: formatDisplayDate(
        issue?.publicationDate ?? publicationMilestone?.endDate ?? publicationMilestone?.startDate ?? '',
      ),
    },
    progress,
    progressAction,
  };
};

export const buildScheduleMilestoneTooltipData = (
  entry: ScheduleEntryDisplay,
  milestoneIndex: number,
  referenceDate: Date = getMockToday(),
): ScheduleMilestoneTooltipData | null => {
  const milestone = entry.displayMilestones[milestoneIndex];
  if (!milestone) return null;

  const issue = entry.linkedIssue;
  const publicationMilestone = entry.displayMilestones.find(m => m.kind === 'online-publication')
    ?? entry.displayMilestones.find(m => m.kind === 'print-package');

  const badgeStatus = getScheduleMilestoneStatusForEntry(
    entry.displayMilestones,
    milestoneIndex,
    issue,
    referenceDate,
  );

  const journal = JOURNALS.find(j => j.id === entry.journalId);
  const issueLine = journal
    ? `${journal.fullName} (${journal.acronym}) · Vol. ${entry.volume}, Iss. ${entry.issue}`
    : `${entry.journalAcronym} · ${entry.volume}/${entry.issue}`;

  return {
    issueLine,
    milestoneLine: `${milestone.label} — ${MILESTONE_STATUS_LABEL[badgeStatus]}`,
    dateRange: formatMilestoneRange(milestone.startDate, milestone.endDate),
    issueCloseDate: formatDisplayDate(issue?.issueCloseDate ?? milestone.startDate),
    publicationDate: formatDisplayDate(
      issue?.publicationDate ?? publicationMilestone?.endDate ?? publicationMilestone?.startDate ?? '',
    ),
  };
};
