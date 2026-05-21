import type { JournalSchedule, ScheduledIssueEntry } from '../types/schedule';
import { sanitizeScheduleEntries } from '../utils/scheduleEntrySanitize';
import { getJournalAcronym } from './journals';
import { generateMockScheduleEntries } from './mockScheduleEntries';

/** Storage bucket id for the bundled multi-journal sample import. */
export const DEMO_SCHEDULE_JOURNAL_ID = 'multi-journal-import';

export const createDemoJournalSchedule = (): JournalSchedule => ({
  journalId: DEMO_SCHEDULE_JOURNAL_ID,
  fileName: 'multi-journal-schedule-sample.xlsx',
  fileSize: 245760,
  uploadedAt: new Date().toISOString(),
  entries: sanitizeScheduleEntries(generateMockScheduleEntries()),
});

/** Older mock imports tagged every row as JAMA (journal id 1). */
export const isStaleSingleJournalSchedule = (entries: ScheduledIssueEntry[]): boolean => {
  if (entries.length === 0) return false;
  const journalIds = new Set(entries.map(entry => entry.journalId));
  const acronyms = new Set(entries.map(entry => entry.journalAcronym));
  return (
    journalIds.size === 1
    && (journalIds.has('1') || acronyms.has('JAMA') || acronyms.has(''))
  );
};

export const repairScheduleEntryMetadata = (
  entry: ScheduledIssueEntry,
): ScheduledIssueEntry => {
  const acronym = getJournalAcronym(entry.journalId);
  return acronym ? { ...entry, journalAcronym: acronym } : entry;
};

export const loadSchedulesForDemo = (
  schedules: JournalSchedule[],
): JournalSchedule[] => {
  const repaired = schedules.map(schedule => ({
    ...schedule,
    entries: sanitizeScheduleEntries(
      schedule.entries.map(repairScheduleEntryMetadata),
    ),
  }));

  const allEntries = repaired.flatMap(schedule => schedule.entries ?? []);
  if (allEntries.length === 0 || isStaleSingleJournalSchedule(allEntries)) {
    return [createDemoJournalSchedule()];
  }

  return repaired;
};
