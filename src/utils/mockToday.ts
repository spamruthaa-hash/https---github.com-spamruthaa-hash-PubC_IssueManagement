/** Fixed "today" for schedule/issue mock-ups (May 21, 2026). */
export const getMockToday = (): Date => new Date(2026, 4, 21);

/** ISO timestamp aligned with the mock timeline (noon local on mock today). */
export const getMockNowIso = (): string => {
  const today = getMockToday();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0).toISOString();
};
