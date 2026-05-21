import type { IssueOutputFormat } from '../types/issue';
import type { ScheduledIssueEntry, ScheduleMilestoneKind } from '../types/schedule';
import { buildMilestonesForEntry } from '../data/mockScheduleEntries';

const ALLOWED_KINDS = new Set<ScheduleMilestoneKind>([
  'issue-creation',
  'article-lineup',
  'folio-creation',
  'folio-preparation',
  'folio-review',
  'print-package',
  'online-publication',
]);

const LEGACY_KINDS = new Set(['issue-close']);

const normalizeOutputFormat = (value: unknown): IssueOutputFormat => {
  if (value === 'print' || value === 'online' || value === 'both') return value;
  return 'both';
};

const getIssueCreationDate = (entry: ScheduledIssueEntry): string | null => {
  const fromKind = entry.milestones.find(m => m.kind === 'issue-creation')?.startDate;
  if (fromKind) return fromKind;

  const fromLabel = entry.milestones.find(
    m => m.label.toLowerCase() === 'issue creation',
  )?.startDate;
  return fromLabel ?? entry.milestones[0]?.startDate ?? null;
};

const milestoneAllowedForFormat = (
  kind: ScheduleMilestoneKind,
  outputFormat: IssueOutputFormat,
): boolean => {
  if (kind === 'print-package') {
    return outputFormat === 'print' || outputFormat === 'both';
  }
  if (kind === 'online-publication') {
    return outputFormat === 'online' || outputFormat === 'both';
  }
  return true;
};

const entryNeedsRebuild = (
  entry: ScheduledIssueEntry,
  outputFormat: IssueOutputFormat,
): boolean => {
  if (entry.milestones.length === 0) return true;

  if (entry.milestones.some(m => LEGACY_KINDS.has(m.kind as string))) return true;

  if (entry.milestones.some(m => !ALLOWED_KINDS.has(m.kind))) return true;

  const hasPrint = entry.milestones.some(m => m.kind === 'print-package');
  const hasOnline = entry.milestones.some(m => m.kind === 'online-publication');

  if ((outputFormat === 'print' || outputFormat === 'both') && !hasPrint) return true;
  if ((outputFormat === 'online' || outputFormat === 'both') && !hasOnline) return true;
  if (outputFormat === 'print' && hasOnline) return true;
  if (outputFormat === 'online' && hasPrint) return true;

  return false;
};

export const sanitizeScheduleEntry = (entry: ScheduledIssueEntry): ScheduledIssueEntry => {
  const outputFormat = normalizeOutputFormat(entry.outputFormat);
  const creationDate = getIssueCreationDate(entry);

  if (!creationDate || entryNeedsRebuild(entry, outputFormat)) {
    return {
      ...entry,
      outputFormat,
      milestones: creationDate
        ? buildMilestonesForEntry(creationDate, outputFormat)
        : [],
    };
  }

  const canonical = buildMilestonesForEntry(creationDate, outputFormat);

  const milestones = canonical.map(template => {
    const existing = entry.milestones.find(m => m.kind === template.kind);
    if (!existing || !milestoneAllowedForFormat(template.kind, outputFormat)) {
      return template;
    }
    return {
      ...template,
      startDate: existing.startDate,
      endDate: existing.endDate,
    };
  });

  return { ...entry, outputFormat, milestones };
};

export const sanitizeScheduleEntries = (
  entries: ScheduledIssueEntry[],
): ScheduledIssueEntry[] => entries.map(sanitizeScheduleEntry);
