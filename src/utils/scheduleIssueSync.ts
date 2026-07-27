import { ARTICLES_BY_JOURNAL } from '../data/articles';
import { buildDefaultFolioArrangementItems } from './folioArrangementDefaults';
import { buildMilestonesForEntry } from '../data/mockScheduleEntries';
import type { Issue, IssueMilestone } from '../types/issue';
import type { ScheduledIssueEntry, ScheduleMilestone, ScheduleMilestoneKind } from '../types/schedule';
import { getMockToday } from './mockToday';
import type { MilestoneBadgeStatus } from './scheduleMilestoneStatus';
import {
  getIssueCreationDate,
  getScheduleMilestoneStatus,
  isScheduleMilestoneCompleted,
} from './scheduleMilestoneStatus';
import { getHiddenScheduleMilestoneKinds } from './userScheduleMilestones';
import { getCurrentUser } from '../auth/currentUser';

const ESTIMATED_MILESTONE_DAYS = 5;

const SCHEDULE_KIND_ORDER: ScheduleMilestoneKind[] = [
  'issue-creation',
  'article-lineup',
  'folio-creation',
  'folio-preparation',
  'folio-review',
  'print-package',
  'online-publication',
];

const ISSUE_MILESTONE_TO_KIND: Partial<Record<IssueMilestone, ScheduleMilestoneKind>> = {
  'Article Lineup': 'article-lineup',
  'Folio Creation': 'folio-creation',
  'Folio Preparation': 'folio-preparation',
  'Final Review': 'folio-review',
  Print: 'print-package',
  'Online Publication': 'online-publication',
};

const isoFromDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseIso = (value: string): Date => {
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const addDaysIso = (iso: string, days: number): string => {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return isoFromDate(date);
};

export const findIssueForScheduleEntry = (
  entry: ScheduledIssueEntry,
  issues: Issue[],
): Issue | undefined =>
  issues.find(
    issue =>
      issue.journalId === entry.journalId
      && issue.volume === entry.volume
      && issue.issue === entry.issue,
  );

const mapIssueMilestoneToKind = (milestone: IssueMilestone): ScheduleMilestoneKind => {
  const mapped = ISSUE_MILESTONE_TO_KIND[milestone];
  if (mapped) return mapped;
  if (milestone === 'Final Review') return 'folio-review';
  return 'article-lineup';
};

export const isScheduleEntryReadyForIssue = (
  entry: ScheduledIssueEntry,
  referenceDate: Date = getMockToday(),
): boolean => {
  const creationDate = getIssueCreationDate(entry.milestones);
  if (!creationDate) return false;
  const creation = parseIso(creationDate);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
  );
  return today.getTime() >= creation.getTime();
};

export const getActiveScheduleMilestoneIndex = (
  issue: Issue,
  milestones: ScheduleMilestone[],
  referenceDate: Date = getMockToday(),
): number => {
  if (issue.status === 'completed') return milestones.length;

  const dateBasedIndex = milestones.findIndex(
    m => !isScheduleMilestoneCompleted(m, referenceDate),
  );
  const kind = mapIssueMilestoneToKind(issue.milestone);
  const issueIndex = milestones.findIndex(m => m.kind === kind);

  if (dateBasedIndex < 0) return milestones.length;

  if (issueIndex >= 0) {
    return Math.max(dateBasedIndex, issueIndex);
  }

  return dateBasedIndex >= 0 ? dateBasedIndex : 1;
};

export const getScheduleMilestoneStatusFromIssue = (
  issue: Issue,
  milestones: ScheduleMilestone[],
  milestoneIndex: number,
  referenceDate: Date = getMockToday(),
): MilestoneBadgeStatus => {
  const milestone = milestones[milestoneIndex];

  if (milestone.kind === 'issue-creation') {
    return 'completed';
  }

  if (isScheduleMilestoneCompleted(milestone, referenceDate)) {
    return 'completed';
  }

  if (issue.status === 'completed') {
    return 'completed';
  }

  const activeIndex = getActiveScheduleMilestoneIndex(issue, milestones, referenceDate);

  if (milestoneIndex < activeIndex) {
    return 'completed';
  }

  if (milestoneIndex === activeIndex) {
    return 'in-progress';
  }

  return 'not-started';
};

export const getScheduleMilestoneStatusForEntry = (
  milestones: ScheduleMilestone[],
  milestoneIndex: number,
  linkedIssue?: Issue,
  referenceDate: Date = getMockToday(),
): MilestoneBadgeStatus => {
  if (linkedIssue) {
    return getScheduleMilestoneStatusFromIssue(
      linkedIssue,
      milestones,
      milestoneIndex,
      referenceDate,
    );
  }
  return getScheduleMilestoneStatus(milestones, milestoneIndex, referenceDate);
};

/** Build schedule bar dates from live issue progress (matches Issue Details timeline). */
export const buildScheduleMilestonesFromIssue = (issue: Issue): ScheduleMilestone[] => {
  const createdIso = isoFromDate(parseIso(issue.createdAt));
  const template = buildMilestonesForEntry(createdIso, issue.outputFormat);
  const byKind = new Map(template.map(m => [m.kind, m]));

  const getLabel = (kind: ScheduleMilestoneKind): string =>
    byKind.get(kind)?.label ?? kind;

  const milestones: ScheduleMilestone[] = [
    {
      kind: 'issue-creation',
      label: getLabel('issue-creation'),
      startDate: createdIso,
      endDate: createdIso,
    },
  ];

  let nextStart = createdIso;

  const lineupStartIso = issue.articleLineupStartedAt
    ? isoFromDate(parseIso(issue.articleLineupStartedAt))
    : nextStart;
  const lineupEndIso = issue.articleLineupConfirmedAt
    ? isoFromDate(parseIso(issue.articleLineupConfirmedAt))
    : addDaysIso(lineupStartIso, ESTIMATED_MILESTONE_DAYS);

  milestones.push({
    kind: 'article-lineup',
    label: getLabel('article-lineup'),
    startDate: lineupStartIso,
    endDate: lineupEndIso,
  });
  nextStart = lineupEndIso;

  const folioCreationStartIso = issue.folioArrangementConfirmedAt
    ? isoFromDate(parseIso(issue.articleLineupConfirmedAt ?? nextStart))
    : nextStart;
  const folioCreationEndIso = issue.folioArrangementConfirmedAt
    ? isoFromDate(parseIso(issue.folioArrangementConfirmedAt))
    : addDaysIso(folioCreationStartIso, ESTIMATED_MILESTONE_DAYS);

  milestones.push({
    kind: 'folio-creation',
    label: getLabel('folio-creation'),
    startDate: folioCreationStartIso,
    endDate: folioCreationEndIso,
  });
  nextStart = folioCreationEndIso;

  const folioPreparationStartIso = issue.folioPreparationStartedAt
    ? isoFromDate(parseIso(issue.folioPreparationStartedAt))
    : issue.folioArrangementConfirmedAt
      ? isoFromDate(parseIso(issue.folioArrangementConfirmedAt))
      : nextStart;
  const folioPreparationEndIso = issue.folioPreparationConfirmedAt
    ? isoFromDate(parseIso(issue.folioPreparationConfirmedAt))
    : addDaysIso(folioPreparationStartIso, ESTIMATED_MILESTONE_DAYS);

  milestones.push({
    kind: 'folio-preparation',
    label: getLabel('folio-preparation'),
    startDate: folioPreparationStartIso,
    endDate: folioPreparationEndIso,
  });
  nextStart = folioPreparationEndIso;

  const folioReviewStartIso = nextStart;
  const folioReviewEndIso = issue.folioReviewConfirmedAt
    ? isoFromDate(parseIso(issue.folioReviewConfirmedAt))
    : addDaysIso(folioReviewStartIso, ESTIMATED_MILESTONE_DAYS);

  milestones.push({
    kind: 'folio-review',
    label: getLabel('folio-review'),
    startDate: folioReviewStartIso,
    endDate: folioReviewEndIso,
  });
  nextStart = folioReviewEndIso;

  if (issue.outputFormat === 'print' || issue.outputFormat === 'both') {
    const printStartIso = nextStart;
    const printEndIso = issue.printConfirmedAt
      ? isoFromDate(parseIso(issue.printConfirmedAt))
      : addDaysIso(printStartIso, ESTIMATED_MILESTONE_DAYS);

    milestones.push({
      kind: 'print-package',
      label: getLabel('print-package'),
      startDate: printStartIso,
      endDate: printEndIso,
    });
    nextStart = printEndIso;
  }

  if (issue.outputFormat === 'online' || issue.outputFormat === 'both') {
    const onlineStartIso = nextStart;
    const onlineEndIso = issue.onlinePublicationConfirmedAt
      ? isoFromDate(parseIso(issue.onlinePublicationConfirmedAt))
      : addDaysIso(onlineStartIso, ESTIMATED_MILESTONE_DAYS);

    milestones.push({
      kind: 'online-publication',
      label: getLabel('online-publication'),
      startDate: onlineStartIso,
      endDate: onlineEndIso,
    });
  }

  return SCHEDULE_KIND_ORDER.flatMap(kind => {
    const found = milestones.find(m => m.kind === kind);
    return found ? [found] : [];
  });
};

export interface ScheduleEntryDisplay extends ScheduledIssueEntry {
  linkedIssue?: Issue;
  displayMilestones: ScheduleMilestone[];
  usesIssueProgress: boolean;
}

export const scheduleEntryKey = (
  entry: Pick<ScheduledIssueEntry, 'journalId' | 'volume' | 'issue'>,
): string => `${entry.journalId}|${entry.volume}|${entry.issue}`;

/** Stable id so schedule rows and manually created issues can match. */
export const issueIdForScheduleEntry = (
  entry: Pick<ScheduledIssueEntry, 'journalId' | 'volume' | 'issue'>,
): string => `issue-${scheduleEntryKey(entry).replace(/\|/g, '-')}`;

const isoAtNoon = (isoDate: string): string => `${isoDate}T12:00:00.000Z`;

const milestoneLabelToIssueMilestone = (kind: ScheduleMilestoneKind): IssueMilestone => {
  switch (kind) {
    case 'article-lineup':
      return 'Article Lineup';
    case 'folio-creation':
      return 'Folio Creation';
    case 'folio-preparation':
      return 'Folio Preparation';
    case 'folio-review':
      return 'Final Review';
    case 'print-package':
      return 'Print';
    case 'online-publication':
      return 'Online Publication';
    default:
      return 'Article Lineup';
  }
};

/** Mock progress from schedule dates (past milestones marked complete). */
export const deriveMockIssueProgressFromSchedule = (
  entry: ScheduledIssueEntry,
  referenceDate: Date = getMockToday(),
): Pick<
  Issue,
  | 'milestone'
  | 'assignedArticleIds'
  | 'articleLineupConfirmedAt'
  | 'articleLineupConfirmedBy'
  | 'folioArrangementConfirmedAt'
  | 'folioPreparationStartedAt'
  | 'folioPreparationConfirmedAt'
  | 'folioReviewConfirmedAt'
> => {
  const pool = ARTICLES_BY_JOURNAL[entry.journalId] ?? [];
  const assignedArticleIds = pool.slice(0, Math.min(4, pool.length)).map(a => a.id);

  let milestone: IssueMilestone = 'Article Lineup';
  let articleLineupConfirmedAt: string | undefined;
  let articleLineupConfirmedBy: string | undefined;
  let folioArrangementConfirmedAt: string | undefined;
  let folioPreparationStartedAt: string | undefined;
  let folioPreparationConfirmedAt: string | undefined;
  let folioReviewConfirmedAt: string | undefined;

  for (const step of entry.milestones) {
    if (step.kind === 'issue-creation') continue;

    if (!isScheduleMilestoneCompleted(step, referenceDate)) {
      milestone = milestoneLabelToIssueMilestone(step.kind);
      break;
    }

    switch (step.kind) {
      case 'article-lineup':
        articleLineupConfirmedAt = isoAtNoon(step.endDate);
        articleLineupConfirmedBy = 'Demo Editor';
        milestone = 'Folio Creation';
        break;
      case 'folio-creation':
        folioArrangementConfirmedAt = isoAtNoon(step.endDate);
        milestone = 'Folio Preparation';
        break;
      case 'folio-preparation':
        folioPreparationStartedAt = isoAtNoon(step.startDate);
        folioPreparationConfirmedAt = isoAtNoon(step.endDate);
        milestone = 'Final Review';
        break;
      case 'folio-review':
        folioReviewConfirmedAt = isoAtNoon(step.endDate);
        milestone = entry.outputFormat === 'online' ? 'Online Publication' : 'Print';
        break;
      case 'print-package':
        milestone = entry.outputFormat === 'both' ? 'Online Publication' : 'Print';
        break;
      case 'online-publication':
        milestone = 'Online Publication';
        break;
      default:
        break;
    }
  }

  return {
    milestone,
    assignedArticleIds,
    articleLineupConfirmedAt,
    articleLineupConfirmedBy,
    folioArrangementConfirmedAt,
    folioPreparationStartedAt,
    folioPreparationConfirmedAt,
    folioReviewConfirmedAt,
  };
};

/**
 * Materialize an in-progress issue from a schedule row (issue creation treated as complete).
 * Used so uploaded schedules appear in the Issues in-progress table.
 */
export const createIssueFromScheduleEntry = (
  entry: ScheduledIssueEntry,
  referenceDate: Date = getMockToday(),
): Issue => {
  const creation = entry.milestones.find(m => m.kind === 'issue-creation');
  const publication = entry.milestones.find(m => m.kind === 'online-publication')
    ?? entry.milestones.find(m => m.kind === 'print-package');
  const createdAt = creation
    ? isoAtNoon(creation.startDate)
    : new Date().toISOString();
  const progress = deriveMockIssueProgressFromSchedule(entry, referenceDate);

  const baseIssue = {
    id: issueIdForScheduleEntry(entry),
    journalId: entry.journalId,
    journalAcronym: entry.journalAcronym,
    volume: entry.volume,
    issue: entry.issue,
    issueTitle: `${entry.journalAcronym} ${entry.volume}/${entry.issue}`,
    coverMonth: creation?.startDate.slice(0, 7) ?? '',
    publicationDate: publication?.endDate ?? publication?.startDate ?? creation?.startDate ?? '',
    issueCloseDate: creation?.startDate ?? '',
    issueType: entry.issueType,
    outputFormat: entry.outputFormat,
    status: 'in-progress' as const,
    createdAt,
    ...progress,
  };

  const folioArrangement = progress.folioArrangementConfirmedAt
    ? {
        items: buildDefaultFolioArrangementItems(baseIssue),
        submittedAt: progress.folioArrangementConfirmedAt,
        submittedBy: progress.articleLineupConfirmedBy ?? 'Demo Editor',
      }
    : undefined;

  return {
    ...baseIssue,
    folioArrangement,
  };
};

export const listIssuesMissingForSchedule = (
  entries: ScheduledIssueEntry[],
  issues: Issue[],
  referenceDate: Date = getMockToday(),
): Issue[] => {
  const existingKeys = new Set(
    issues.map(i => scheduleEntryKey(i)),
  );

  return entries
    .filter(entry => !existingKeys.has(scheduleEntryKey(entry)))
    .filter(entry => isScheduleEntryReadyForIssue(entry, referenceDate))
    .map(entry => createIssueFromScheduleEntry(entry, referenceDate));
};

/** Schedule rows synced from Create Issue use this id prefix (see createScheduleEntryFromIssue). */
export const isManualScheduleEntry = (entry: ScheduledIssueEntry): boolean =>
  entry.id.startsWith('schedule-issue-');

/** Remove auto-created issues that are not yet due (e.g. future creation date). */
export const listPrematureScheduleIssueIds = (
  entries: ScheduledIssueEntry[],
  issues: Issue[],
  referenceDate: Date = getMockToday(),
): string[] => {
  const entryByKey = new Map(entries.map(e => [scheduleEntryKey(e), e]));
  return issues
    .filter(issue => {
      const entry = entryByKey.get(scheduleEntryKey(issue));
      if (!entry) return false;
      // User-created issues must never be auto-deleted by schedule sync.
      if (isManualScheduleEntry(entry)) return false;
      return !isScheduleEntryReadyForIssue(entry, referenceDate);
    })
    .map(issue => issue.id);
};

/** Schedule row derived from a manually created issue (not from an upload). */
export const createScheduleEntryFromIssue = (issue: Issue): ScheduledIssueEntry => ({
  id: `schedule-${issue.id}`,
  journalId: issue.journalId,
  journalAcronym: issue.journalAcronym,
  volume: issue.volume,
  issue: issue.issue,
  issueType: issue.issueType,
  outputFormat: issue.outputFormat,
  milestones: buildScheduleMilestonesFromIssue(issue),
});

export const listScheduleEntriesMissingForIssues = (
  entries: ScheduledIssueEntry[],
  issues: Issue[],
): ScheduledIssueEntry[] => {
  const existingKeys = new Set(entries.map(scheduleEntryKey));
  return issues
    .filter(issue => !existingKeys.has(scheduleEntryKey(issue)))
    .map(createScheduleEntryFromIssue);
};

export interface IssueTableMilestoneDisplay {
  label: string;
  badgeStatus: MilestoneBadgeStatus;
}

/** Current milestone + badge for Issues table (aligned with schedule / details progress). */
export const getIssueTableMilestoneDisplay = (
  issue: Issue,
  referenceDate: Date = getMockToday(),
): IssueTableMilestoneDisplay => {
  if (issue.status === 'completed') {
    const label = issue.outputFormat === 'online' || issue.outputFormat === 'both'
      ? 'Online Publication'
      : 'Print';
    return { label, badgeStatus: 'completed' };
  }

  // Steps the signed-in account skips shouldn't surface as its current milestone.
  const hiddenKinds = getHiddenScheduleMilestoneKinds(getCurrentUser()?.email);
  const allMilestones = buildScheduleMilestonesFromIssue(issue);
  const milestones = hiddenKinds.length === 0
    ? allMilestones
    : allMilestones.filter(m => !hiddenKinds.includes(m.kind));
  const activeIndex = getActiveScheduleMilestoneIndex(issue, milestones, referenceDate);
  const active = milestones[activeIndex]
    ?? milestones.find(m => m.kind === 'article-lineup')
    ?? milestones[0];

  return {
    label: active.label,
    badgeStatus: getScheduleMilestoneStatusFromIssue(
      issue,
      milestones,
      activeIndex,
      referenceDate,
    ),
  };
};

export const resolveScheduleEntryDisplay = (
  entry: ScheduledIssueEntry,
  issues: Issue[],
): ScheduleEntryDisplay => {
  const linkedIssue = findIssueForScheduleEntry(entry, issues);

  if (!linkedIssue) {
    return {
      ...entry,
      linkedIssue: undefined,
      displayMilestones: entry.milestones,
      usesIssueProgress: false,
    };
  }

  return {
    ...entry,
    issueType: linkedIssue.issueType,
    outputFormat: linkedIssue.outputFormat,
    linkedIssue,
    displayMilestones: buildScheduleMilestonesFromIssue(linkedIssue),
    usesIssueProgress: true,
  };
};
