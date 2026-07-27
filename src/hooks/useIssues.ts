import { useCallback, useEffect, useState } from 'react';
import { getJournalAcronym } from '../data/journals';
import type { Issue } from '../types/issue';
import { getCurrentUserEmail, userScopedStorageKey } from '../utils/userStorageKey';

const STORAGE_KEY_BASE = 'pubc.issues.v3';

const getStorageKey = (): string => userScopedStorageKey(STORAGE_KEY_BASE);

const normalizeIssue = (raw: unknown): Issue | null => {
  if (!raw || typeof raw !== 'object') return null;
  const issue = raw as Partial<Issue>;
  if (!issue.id || !issue.journalId) return null;

  return {
    ...issue,
    id: issue.id,
    journalId: issue.journalId,
    journalAcronym: getJournalAcronym(issue.journalId) || issue.journalAcronym || '',
    volume: issue.volume ?? '',
    issue: issue.issue ?? '',
    issueTitle: issue.issueTitle ?? '',
    coverMonth: issue.coverMonth ?? '',
    publicationDate: issue.publicationDate ?? '',
    issueCloseDate: issue.issueCloseDate ?? '',
    issueType: issue.issueType === 'special' ? 'special' : 'regular',
    outputFormat:
      issue.outputFormat === 'print' ||
      issue.outputFormat === 'online' ||
      issue.outputFormat === 'both'
        ? issue.outputFormat
        : 'online',
    assignedArticleIds: Array.isArray(issue.assignedArticleIds)
      ? issue.assignedArticleIds
      : [],
    milestone: issue.milestone ?? 'Article Lineup',
    status: issue.status === 'completed' ? 'completed' : 'in-progress',
    createdAt: issue.createdAt ?? new Date().toISOString(),
  } as Issue;
};

const readFromStorage = (): Issue[] => {
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeIssue)
      .filter((issue): issue is Issue => issue !== null);
  } catch {
    return [];
  }
};

const writeToStorage = (issues: Issue[]) => {
  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(issues));
  } catch {
    // Storage failures (private mode, quota) are non-fatal — UI keeps working in-memory.
  }
};

/** Clears only the signed-in account's issues; other accounts keep theirs. */
export const clearStoredIssues = () => {
  try {
    window.localStorage.removeItem(getStorageKey());
  } catch {
    // ignore
  }
};

export const useIssues = () => {
  const [issues, setIssues] = useState<Issue[]>(() => readFromStorage());
  const userEmail = getCurrentUserEmail();

  useEffect(() => {
    writeToStorage(issues);
  }, [issues]);

  /** Reload from the account's own bucket when the signed-in user changes. */
  useEffect(() => {
    setIssues(readFromStorage());
  }, [userEmail]);

  /** Cross-tab sync: pick up changes made in another tab of the same browser. */
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== getStorageKey()) return;
      setIssues(readFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    setIssues(prev => [issue, ...prev]);
  }, []);

  const addIssues = useCallback((newIssues: Issue[]) => {
    if (newIssues.length === 0) return;
    setIssues(prev => {
      const keys = new Set(prev.map(i => `${i.journalId}|${i.volume}|${i.issue}`));
      const toAdd = newIssues.filter(
        i => !keys.has(`${i.journalId}|${i.volume}|${i.issue}`),
      );
      return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
    });
  }, []);

  const upsertIssue = useCallback((issue: Issue) => {
    setIssues(prev => {
      const index = prev.findIndex(
        i =>
          i.journalId === issue.journalId
          && i.volume === issue.volume
          && i.issue === issue.issue,
      );
      if (index === -1) return [issue, ...prev];
      const next = [...prev];
      next[index] = { ...next[index], ...issue, id: next[index].id };
      return next;
    });
  }, []);

  const removeIssue = useCallback((id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  }, []);

  const restoreIssue = useCallback((issue: Issue) => {
    setIssues(prev => (prev.some(i => i.id === issue.id) ? prev : [issue, ...prev]));
  }, []);

  const updateIssue = useCallback((id: string, updates: Partial<Issue>) => {
    setIssues(prev => prev.map(issue => (
      issue.id === id ? { ...issue, ...updates } : issue
    )));
  }, []);

  return {
    issues,
    addIssue,
    addIssues,
    upsertIssue,
    removeIssue,
    restoreIssue,
    updateIssue,
  };
};
