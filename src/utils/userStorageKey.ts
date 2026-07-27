import { getCurrentUser } from '../auth/currentUser';

/**
 * Keeps each signed-in account's data separate, so issues created under one
 * login never show up under another.
 */
export const userScopedStorageKey = (baseKey: string): string => {
  const email = getCurrentUser()?.email?.trim().toLowerCase();
  return email ? `${baseKey}::${email}` : baseKey;
};

export const getCurrentUserEmail = (): string =>
  getCurrentUser()?.email?.trim().toLowerCase() ?? '';
