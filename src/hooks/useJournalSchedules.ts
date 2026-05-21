import { useCallback, useEffect, useState } from 'react';
import type { Issue } from '../types/issue';
import type { JournalSchedule, ScheduledIssueEntry } from '../types/schedule';
import { sanitizeScheduleEntries } from '../utils/scheduleEntrySanitize';
import {
  createScheduleEntryFromIssue,
  listScheduleEntriesMissingForIssues,
} from '../utils/scheduleIssueSync';
import {
  mergeScheduleEntriesIntoStorage,
  removeScheduleEntryFromStorage,
} from '../utils/scheduleStorageMerge';
import { getAllScheduleEntries } from '../data/mockScheduleEntries';
import { loadSchedulesForDemo } from '../data/demoSchedule';

const STORAGE_KEY = 'pubc.journal-schedules.v6';

const normalizeSchedule = (raw: unknown): JournalSchedule | null => {
  if (!raw || typeof raw !== 'object') return null;
  const schedule = raw as Partial<JournalSchedule>;
  if (!schedule.journalId || !schedule.fileName) return null;

  return {
    journalId: schedule.journalId,
    fileName: schedule.fileName,
    fileSize: typeof schedule.fileSize === 'number' ? schedule.fileSize : 0,
    uploadedAt: schedule.uploadedAt ?? new Date().toISOString(),
    entries: Array.isArray(schedule.entries)
      ? sanitizeScheduleEntries(schedule.entries as ScheduledIssueEntry[])
      : [],
  };
};

const readFromStorage = (): JournalSchedule[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const schedules = parsed
      .map(normalizeSchedule)
      .filter((schedule): schedule is JournalSchedule => schedule !== null);
    return loadSchedulesForDemo(schedules);
  } catch {
    return loadSchedulesForDemo([]);
  }
};

const writeToStorage = (schedules: JournalSchedule[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch {
    // Storage failures are non-fatal — UI keeps working in-memory.
  }
};

export const clearStoredJournalSchedules = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const useJournalSchedules = () => {
  const [schedules, setSchedules] = useState<JournalSchedule[]>(() => readFromStorage());

  useEffect(() => {
    writeToStorage(schedules);
  }, [schedules]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setSchedules(readFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const uploadSchedule = useCallback((schedule: JournalSchedule) => {
    setSchedules(prev => {
      const withoutJournal = prev.filter(s => s.journalId !== schedule.journalId);
      return [schedule, ...withoutJournal];
    });
  }, []);

  const hasScheduleData = schedules.some(s => (s.entries?.length ?? 0) > 0);

  const addScheduleEntries = useCallback((entries: ScheduledIssueEntry[]) => {
    if (entries.length === 0) return;
    setSchedules(prev => mergeScheduleEntriesIntoStorage(prev, entries));
  }, []);

  const upsertScheduleEntryFromIssue = useCallback((issue: Issue) => {
    addScheduleEntries([createScheduleEntryFromIssue(issue)]);
  }, [addScheduleEntries]);

  const removeScheduleEntry = useCallback(
    (entry: Pick<ScheduledIssueEntry, 'journalId' | 'volume' | 'issue'>) => {
      setSchedules(prev => removeScheduleEntryFromStorage(prev, entry));
    },
    [],
  );

  const syncScheduleEntriesFromIssues = useCallback((issues: Issue[]) => {
    setSchedules(prev => {
      const stored = getAllScheduleEntries(prev);
      const missing = listScheduleEntriesMissingForIssues(stored, issues);
      if (missing.length === 0) return prev;
      return mergeScheduleEntriesIntoStorage(prev, missing);
    });
  }, []);

  const getScheduleForJournal = useCallback(
    (journalId: string) => schedules.find(s => s.journalId === journalId),
    [schedules],
  );

  return {
    schedules,
    uploadSchedule,
    hasUploadedSchedule: hasScheduleData,
    hasScheduleData,
    addScheduleEntries,
    upsertScheduleEntryFromIssue,
    removeScheduleEntry,
    syncScheduleEntriesFromIssues,
    getScheduleForJournal,
  };
};
