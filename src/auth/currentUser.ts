import type { AppUser } from '../data/users';

const STORAGE_KEY = 'pubc_current_user';

export type CurrentUser = Omit<AppUser, 'password'>;

export function setCurrentUser(user: AppUser): void {
  const safeUser: CurrentUser = {
    email: user.email,
    name: user.name,
    initials: user.initials,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
}

export function getCurrentUser(): CurrentUser | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function clearCurrentUser(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
