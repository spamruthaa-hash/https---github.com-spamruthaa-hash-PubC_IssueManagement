import { useCallback, useEffect, useState } from 'react';
import type { Issue } from '../types/issue';

const STORAGE_KEY = 'pubc.issues.v1';

const readFromStorage = (): Issue[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Issue[]) : [];
  } catch {
    return [];
  }
};

const writeToStorage = (issues: Issue[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  } catch {
    // Storage failures (private mode, quota) are non-fatal — UI keeps working in-memory.
  }
};

export const clearStoredIssues = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const useIssues = () => {
  const [issues, setIssues] = useState<Issue[]>(() => readFromStorage());

  useEffect(() => {
    writeToStorage(issues);
  }, [issues]);

  /** Cross-tab sync: pick up changes made in another tab of the same browser. */
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setIssues(readFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    setIssues(prev => [issue, ...prev]);
  }, []);

  const removeIssue = useCallback((id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  }, []);

  const restoreIssue = useCallback((issue: Issue) => {
    setIssues(prev => (prev.some(i => i.id === issue.id) ? prev : [issue, ...prev]));
  }, []);

  return { issues, addIssue, removeIssue, restoreIssue };
};
