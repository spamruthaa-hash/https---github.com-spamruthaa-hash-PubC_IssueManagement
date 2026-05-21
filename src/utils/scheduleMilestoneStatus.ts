import type { ScheduleMilestone } from '../types/schedule';

export type MilestoneBadgeStatus = 'in-progress' | 'completed' | 'not-started';

const parseDateOnly = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toDateOnly = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const isScheduleMilestoneCompleted = (
  milestone: ScheduleMilestone,
  referenceDate: Date = new Date(),
): boolean => {
  const today = toDateOnly(referenceDate);
  const end = parseDateOnly(milestone.endDate);
  return today.getTime() > end.getTime();
};

export const getIssueCreationDate = (milestones: ScheduleMilestone[]): string => {
  const creation = milestones.find(m => m.kind === 'issue-creation');
  return creation?.startDate ?? '';
};

/**
 * Sequential milestone status for schedule-only rows (no linked issue).
 * Matches getScheduleMilestoneStatusFromIssue: earlier steps completed,
 * the first incomplete step is in-progress, later steps not-started.
 */
export const getScheduleMilestoneStatus = (
  milestones: ScheduleMilestone[],
  milestoneIndex: number,
  referenceDate: Date = new Date(),
): MilestoneBadgeStatus => {
  const milestone = milestones[milestoneIndex];

  if (milestone.kind === 'issue-creation') {
    return 'completed';
  }

  if (isScheduleMilestoneCompleted(milestone, referenceDate)) {
    return 'completed';
  }

  const activeIndex = milestones.findIndex(
    m => !isScheduleMilestoneCompleted(m, referenceDate),
  );

  if (activeIndex < 0) {
    return 'completed';
  }

  if (milestoneIndex < activeIndex) {
    return 'completed';
  }

  if (milestoneIndex === activeIndex) {
    return 'in-progress';
  }

  return 'not-started';
};
