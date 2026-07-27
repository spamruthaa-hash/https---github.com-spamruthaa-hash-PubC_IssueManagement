import { isJaneDanEmail, isJohnDEmail } from '../data/users';
import type { ScheduleMilestone, ScheduleMilestoneKind } from '../types/schedule';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDay = (iso: string): Date => new Date(`${iso}T12:00:00`);

const pad = (value: number): string => String(value).padStart(2, '0');

const toDayIso = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const shiftDay = (iso: string, days: number): string => {
  const date = parseDay(iso);
  date.setDate(date.getDate() + days);
  return toDayIso(date);
};

const daysBetween = (from: string, to: string): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / MS_PER_DAY);

/**
 * Steps the signed-in account never works on, mirroring the Create Issue flows:
 * Jane Dan lines up articles inside folio creation, and John D uploads a
 * ready-made folio so neither step applies to her/him.
 */
export const getHiddenScheduleMilestoneKinds = (
  email: string | null | undefined,
): ScheduleMilestoneKind[] => {
  if (isJohnDEmail(email)) return ['article-lineup', 'folio-creation'];
  if (isJaneDanEmail(email)) return ['article-lineup'];
  return [];
};

/** Drops the steps that don't apply to this account and closes the gap they leave behind. */
export const applyUserScheduleMilestones = (
  milestones: ScheduleMilestone[],
  email: string | null | undefined,
): ScheduleMilestone[] => {
  const hidden = getHiddenScheduleMilestoneKinds(email);
  if (hidden.length === 0) return milestones;

  const visible: ScheduleMilestone[] = [];
  let shift = 0;

  milestones.forEach((milestone, index) => {
    if (hidden.includes(milestone.kind)) {
      const next = milestones[index + 1];
      if (next) {
        shift += Math.max(0, daysBetween(milestone.startDate, next.startDate));
      }
      return;
    }

    visible.push(
      shift === 0
        ? milestone
        : {
            ...milestone,
            startDate: shiftDay(milestone.startDate, -shift),
            endDate: shiftDay(milestone.endDate, -shift),
          },
    );
  });

  return visible;
};
