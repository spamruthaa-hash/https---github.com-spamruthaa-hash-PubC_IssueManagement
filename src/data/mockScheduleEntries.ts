import { sanitizeScheduleEntries } from '../utils/scheduleEntrySanitize';
import { listScheduleEntriesMissingForIssues } from '../utils/scheduleIssueSync';
import { getJournalAcronym } from './journals';
import type { Issue } from '../types/issue';
import type { IssueOutputFormat } from '../types/issue';
import type { ScheduledIssueEntry, ScheduleMilestone } from '../types/schedule';

const toIsoDate = (year: number, month: number, day: number): string => {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

export const buildMilestonesForEntry = (
  issueCreationDay: string,
  outputFormat: IssueOutputFormat,
): ScheduleMilestone[] => {
  const lineupStart = addDays(issueCreationDay, 7);
  const folioCreationStart = addDays(lineupStart, 6);
  const folioPreparationStart = addDays(folioCreationStart, 6);
  const reviewStart = addDays(folioPreparationStart, 6);
  const printStart = addDays(reviewStart, 6);

  const milestones: ScheduleMilestone[] = [
    {
      kind: 'issue-creation',
      label: 'Issue Creation',
      startDate: issueCreationDay,
      endDate: issueCreationDay,
    },
    {
      kind: 'article-lineup',
      label: 'Article Lineup',
      startDate: lineupStart,
      endDate: addDays(lineupStart, 4),
    },
    {
      kind: 'folio-creation',
      label: 'Folio Creation',
      startDate: folioCreationStart,
      endDate: addDays(folioCreationStart, 4),
    },
    {
      kind: 'folio-preparation',
      label: 'Folio Preparation',
      startDate: folioPreparationStart,
      endDate: addDays(folioPreparationStart, 4),
    },
    {
      kind: 'folio-review',
      label: 'Folio Review',
      startDate: reviewStart,
      endDate: addDays(reviewStart, 4),
    },
  ];

  if (outputFormat === 'print' || outputFormat === 'both') {
    milestones.push({
      kind: 'print-package',
      label: 'Print Package',
      startDate: printStart,
      endDate: addDays(printStart, 4),
    });
  }

  if (outputFormat === 'online' || outputFormat === 'both') {
    const onlineStart =
      outputFormat === 'both' ? addDays(printStart, 6) : addDays(reviewStart, 6);
    milestones.push({
      kind: 'online-publication',
      label: 'Online Publication',
      startDate: onlineStart,
      endDate: addDays(onlineStart, 4),
    });
  }

  return milestones;
};

const TEMPLATES: Array<{
  journalId: string;
  volume: string;
  issue: string;
  issueType: ScheduledIssueEntry['issueType'];
  outputFormat: IssueOutputFormat;
  creationDay: string;
}> = [
  {
    journalId: '1',
    volume: '12',
    issue: '4',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 3),
  },
  {
    journalId: '3',
    volume: '25',
    issue: '1',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 5),
  },
  {
    journalId: '2',
    volume: '26',
    issue: '2',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 10),
  },
  {
    journalId: '11',
    volume: '6',
    issue: '1',
    issueType: 'special',
    outputFormat: 'online',
    creationDay: toIsoDate(2026, 5, 12),
  },
  {
    journalId: '12',
    volume: '24',
    issue: '2',
    issueType: 'regular',
    outputFormat: 'print',
    creationDay: toIsoDate(2026, 5, 15),
  },
  {
    journalId: '17',
    volume: '6',
    issue: '1',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 18),
  },
  {
    journalId: '15',
    volume: '26',
    issue: '2',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 21),
  },
  {
    journalId: '13',
    volume: '16',
    issue: '2',
    issueType: 'special',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 22),
  },
  {
    journalId: '14',
    volume: '26',
    issue: '3',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 25),
  },
  {
    journalId: '16',
    volume: '24',
    issue: '3',
    issueType: 'regular',
    outputFormat: 'print',
    creationDay: toIsoDate(2026, 5, 28),
  },
  {
    journalId: '4',
    volume: '403',
    issue: '12',
    issueType: 'special',
    outputFormat: 'online',
    creationDay: toIsoDate(2026, 5, 14),
  },
  {
    journalId: '6',
    volume: '384',
    issue: '8',
    issueType: 'regular',
    outputFormat: 'both',
    creationDay: toIsoDate(2026, 5, 19),
  },
];

/** Mock import: one file can contain scheduled issues for many journals (not only the uploader). */
export const generateMockScheduleEntries = (_uploadJournalId?: string): ScheduledIssueEntry[] =>
  TEMPLATES.map((template, index) => {
    const acronym = getJournalAcronym(template.journalId);
    return {
      id: `${template.journalId}-schedule-${index}`,
      journalId: template.journalId,
      journalAcronym: acronym,
      volume: template.volume,
      issue: template.issue,
      issueType: template.issueType,
      outputFormat: template.outputFormat,
      milestones: buildMilestonesForEntry(template.creationDay, template.outputFormat),
    };
  });

export const getAllScheduleEntries = (
  schedules: { journalId: string; entries?: ScheduledIssueEntry[] }[],
): ScheduledIssueEntry[] =>
  sanitizeScheduleEntries(schedules.flatMap(schedule => schedule.entries ?? []));

/** Stored schedule rows plus issues created outside an upload (for Gantt / filters). */
export const getCombinedScheduleEntries = (
  schedules: { journalId: string; entries?: ScheduledIssueEntry[] }[],
  issues: Issue[],
): ScheduledIssueEntry[] => {
  const stored = getAllScheduleEntries(schedules);
  const fromIssues = listScheduleEntriesMissingForIssues(stored, issues);
  return sanitizeScheduleEntries([...stored, ...fromIssues]);
};
