import type { JournalSchedule, ScheduledIssueEntry } from '../types/schedule';
import { sanitizeScheduleEntries } from './scheduleEntrySanitize';
import { scheduleEntryKey } from './scheduleIssueSync';

export const MANUAL_SCHEDULE_JOURNAL_ID = 'manual-created';

const manualScheduleShell = (): JournalSchedule => ({
  journalId: MANUAL_SCHEDULE_JOURNAL_ID,
  fileName: 'Created issues',
  fileSize: 0,
  uploadedAt: new Date().toISOString(),
  entries: [],
});

const appendToManualSchedule = (
  schedules: JournalSchedule[],
  entry: ScheduledIssueEntry,
): JournalSchedule[] => {
  const manualIndex = schedules.findIndex(s => s.journalId === MANUAL_SCHEDULE_JOURNAL_ID);
  if (manualIndex < 0) {
    return [{ ...manualScheduleShell(), entries: [entry] }, ...schedules];
  }
  return schedules.map((schedule, index) => {
    if (index !== manualIndex) return schedule;
    const key = scheduleEntryKey(entry);
    const exists = schedule.entries.some(e => scheduleEntryKey(e) === key);
    const entries = exists
      ? schedule.entries.map(e => (scheduleEntryKey(e) === key ? entry : e))
      : [...schedule.entries, entry];
    return { ...schedule, entries: sanitizeScheduleEntries(entries) };
  });
};

/** Insert or update schedule rows (e.g. after Create Issue). */
export const mergeScheduleEntriesIntoStorage = (
  schedules: JournalSchedule[],
  incoming: ScheduledIssueEntry[],
): JournalSchedule[] => {
  if (incoming.length === 0) return schedules;

  let result = [...schedules];

  for (const entry of incoming) {
    const key = scheduleEntryKey(entry);
    let placed = false;

    result = result.map(schedule => {
      const index = schedule.entries.findIndex(e => scheduleEntryKey(e) === key);
      if (index < 0) return schedule;
      placed = true;
      const entries = [...schedule.entries];
      entries[index] = entry;
      return { ...schedule, entries: sanitizeScheduleEntries(entries) };
    });

    if (!placed) {
      result = appendToManualSchedule(result, entry);
    }
  }

  return result;
};

export const removeScheduleEntryFromStorage = (
  schedules: JournalSchedule[],
  entryKey: Pick<ScheduledIssueEntry, 'journalId' | 'volume' | 'issue'>,
): JournalSchedule[] => {
  const key = scheduleEntryKey(entryKey);
  return schedules
    .map(schedule => ({
      ...schedule,
      entries: schedule.entries.filter(e => scheduleEntryKey(e) !== key),
    }))
    .filter(schedule => schedule.entries.length > 0);
};
