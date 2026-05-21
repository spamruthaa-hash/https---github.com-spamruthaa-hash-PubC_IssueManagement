export type ScheduleTimelineRange = 'month' | '3months' | '6months';

const quarterStartMonth = (monthIndex: number): number => Math.floor(monthIndex / 3) * 3;

export interface TimelineColumn {
  id: string;
  label: string;
  start: Date;
  end: Date;
}

export type WeekColumn = TimelineColumn;

export interface TimelineRangeBounds {
  start: Date;
  end: Date;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatMonthYear = (date: Date): string =>
  `${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}`;

/** True when `date` falls within the column's start/end (inclusive). */
export const isColumnContainingDate = (column: TimelineColumn, date: Date): boolean => {
  const time = date.getTime();
  return time >= column.start.getTime() && time <= column.end.getTime();
};

/** @deprecated Use isColumnContainingDate */
export const isWeekContainingDate = isColumnContainingDate;

const startOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfWeek = (weekStart: Date): Date => {
  const copy = new Date(weekStart);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const formatWeekLabel = (start: Date, end: Date): string => {
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  const year = end.getFullYear();
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
};

const monthEndDate = (anchorMonth: Date): Date =>
  new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 0, 23, 59, 59, 999);

/**
 * Week columns for the Gantt header — limited to the anchor month only.
 * Weeks that spill into the next month are clipped (e.g. "May 26 - 31") and
 * no column is added for the following month (no "Jun 1 - 7" while viewing May).
 */
export const buildWeekColumns = (anchorMonth: Date, maxWeeks = 6): WeekColumn[] => {
  const monthStart = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = monthEndDate(anchorMonth);

  const columns: WeekColumn[] = [];
  let cursor = startOfWeek(monthStart);

  while (columns.length < maxWeeks) {
    let start = new Date(cursor);
    let end = endOfWeek(start);

    if (end.getTime() < monthStart.getTime()) {
      cursor = new Date(end);
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (start.getTime() > monthEnd.getTime()) {
      break;
    }

    if (start.getTime() < monthStart.getTime()) {
      start = new Date(monthStart);
    }

    if (end.getTime() > monthEnd.getTime()) {
      end = new Date(monthEnd);
    }

    columns.push({
      id: `week-${columns.length}`,
      label: formatWeekLabel(start, end),
      start,
      end,
    });

    if (end.getTime() >= monthEnd.getTime()) {
      break;
    }

    cursor = new Date(end);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return columns;
};

const parseIsoDate = (iso: string): Date => new Date(`${iso}T12:00:00`);

export const formatMilestoneRange = (startIso: string, endIso: string): string => {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];

  if (startIso === endIso) {
    return `${startMonth} ${start.getDate()}`;
  }
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
};

export interface MilestoneColumnRange {
  startColumn: number;
  endColumn: number;
  span: number;
}

export interface MilestonePlacement {
  startColumn: number;
  span: number;
}

export const WEEK_COLUMN_MIN_PX = 140;
export const MONTH_COLUMN_MIN_PX = 100;
/** Horizontal bar: badge and dates side by side (Figma 445-3340). */
export const MILESTONE_NEXT_TO_NEXT_HEIGHT = 32;
/** Vertical bar: badge above dates when contained in one week column (Figma 445-3401). */
export const MILESTONE_TOP_BOTTOM_HEIGHT = 64;
export const MILESTONE_SINGLE_TOP = 13;
export const MILESTONE_STACK_TOP = 14;
export const MILESTONE_STACK_OFFSET = 41;
export const MILESTONE_TOP_BOTTOM_STACK_OFFSET = 71;
export const SCHEDULE_ROW_MIN_HEIGHT = 96;

/** next-to-next = horizontal; top-bottom = badge stacked above dates. */
export type MilestoneBarLayout = 'next-to-next' | 'top-bottom';

export interface MilestoneRenderItem {
  milestoneIndex: number;
  placement: MilestonePlacement;
  lane: number;
  layout: MilestoneBarLayout;
  topPx: number;
  barHeight: number;
}

export interface ScheduleRowLayout {
  laneAssignments: Array<number | null>;
  isStacked: boolean;
  rowHeight: number;
  items: MilestoneRenderItem[];
}

/**
 * Milestone fits entirely inside one week column → top-bottom layout.
 * Milestone spans multiple week columns → next-to-next layout.
 */
export const getMilestoneBarLayout = (columnSpan: number): MilestoneBarLayout =>
  columnSpan <= 1 ? 'top-bottom' : 'next-to-next';

const rangesOverlap = (a: MilestoneColumnRange, b: MilestoneColumnRange): boolean =>
  a.startColumn <= b.endColumn && b.startColumn <= a.endColumn;

export const getMilestoneColumnRange = (
  milestoneStart: string,
  milestoneEnd: string,
  columns: TimelineColumn[],
): MilestoneColumnRange | null => {
  const start = parseIsoDate(milestoneStart).getTime();
  const end = parseIsoDate(milestoneEnd).getTime();

  let startColumn = -1;
  let endColumn = -1;

  columns.forEach((column, index) => {
    const columnStart = column.start.getTime();
    const columnEnd = column.end.getTime();
    const overlaps = start <= columnEnd && end >= columnStart;
    if (!overlaps) return;
    if (startColumn === -1) startColumn = index;
    endColumn = index;
  });

  if (startColumn === -1) return null;

  return {
    startColumn,
    endColumn,
    span: endColumn - startColumn + 1,
  };
};

/** Assign vertical lanes only when milestones share overlapping week columns. */
export const assignOverlapLanes = (
  milestones: Array<{ startDate: string; endDate: string }>,
  columns: TimelineColumn[],
): Array<number | null> => {
  const ranges = milestones.map(m => getMilestoneColumnRange(m.startDate, m.endDate, columns));
  const lanes: MilestoneColumnRange[][] = [];
  const assignments: Array<number | null> = new Array(milestones.length).fill(null);

  const sortedIndices = milestones
    .map((_, index) => index)
    .filter(index => ranges[index] !== null)
    .sort((a, b) => {
      const rangeA = ranges[a]!;
      const rangeB = ranges[b]!;
      return (
        rangeA.startColumn - rangeB.startColumn
        || rangeA.span - rangeB.span
      );
    });

  sortedIndices.forEach(index => {
    const range = ranges[index]!;
    let lane = 0;

    while (lane < lanes.length && lanes[lane].some(existing => rangesOverlap(existing, range))) {
      lane += 1;
    }

    if (lane === lanes.length) {
      lanes.push([]);
    }

    lanes[lane].push(range);
    assignments[index] = lane;
  });

  return assignments;
};

export const placeMilestoneInWeeks = (
  milestoneStart: string,
  milestoneEnd: string,
  columns: TimelineColumn[],
): MilestonePlacement | null => {
  const range = getMilestoneColumnRange(milestoneStart, milestoneEnd, columns);
  if (!range) return null;

  return {
    startColumn: range.startColumn,
    span: range.span,
  };
};

export const getMilestoneBarHeight = (layout: MilestoneBarLayout): number =>
  layout === 'top-bottom' ? MILESTONE_TOP_BOTTOM_HEIGHT : MILESTONE_NEXT_TO_NEXT_HEIGHT;

export const buildScheduleRowLayout = (
  milestones: Array<{ startDate: string; endDate: string }>,
  columns: TimelineColumn[],
): ScheduleRowLayout => {
  const laneAssignments = assignOverlapLanes(milestones, columns);
  const assignedLanes = laneAssignments.filter((lane): lane is number => lane !== null);
  const maxLane = assignedLanes.length > 0 ? Math.max(...assignedLanes) : 0;
  const isStacked = maxLane > 0;

  const pending: Array<{
    milestoneIndex: number;
    placement: MilestonePlacement;
    lane: number;
    layout: MilestoneBarLayout;
    barHeight: number;
  }> = [];

  milestones.forEach((milestone, milestoneIndex) => {
    const lane = laneAssignments[milestoneIndex];
    if (lane === null) return;

    const placement = placeMilestoneInWeeks(milestone.startDate, milestone.endDate, columns);
    if (!placement) return;

    const layout = getMilestoneBarLayout(placement.span);

    pending.push({
      milestoneIndex,
      placement,
      lane,
      layout,
      barHeight: getMilestoneBarHeight(layout),
    });
  });

  const laneOffsets: number[] = [];
  let stackCursor = MILESTONE_STACK_TOP;

  for (let lane = 0; lane <= maxLane; lane += 1) {
    laneOffsets[lane] = stackCursor;
    const tallestInLane = pending
      .filter(item => item.lane === lane)
      .reduce((max, item) => Math.max(max, item.barHeight), MILESTONE_NEXT_TO_NEXT_HEIGHT);
    const stackStep = tallestInLane === MILESTONE_TOP_BOTTOM_HEIGHT
      ? MILESTONE_TOP_BOTTOM_STACK_OFFSET
      : MILESTONE_STACK_OFFSET;
    stackCursor += stackStep;
  }

  const items: MilestoneRenderItem[] = pending.map(item => ({
    ...item,
    topPx: isStacked ? laneOffsets[item.lane] : MILESTONE_SINGLE_TOP,
  }));

  const rowHeight = items.reduce(
    (max, item) => Math.max(max, item.topPx + item.barHeight + 12),
    SCHEDULE_ROW_MIN_HEIGHT,
  );

  return {
    laneAssignments,
    isStacked,
    rowHeight,
    items,
  };
};

export const shiftMonth = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

export const TIMELINE_RANGE_LABELS: Record<ScheduleTimelineRange, string> = {
  month: '1 month',
  '3months': '3 months',
  '6months': '6 months',
};

export const TIMELINE_RANGE_OPTIONS: ScheduleTimelineRange[] = ['6months', '3months', 'month'];

export const getTimelineRangeBounds = (
  anchorMonth: Date,
  range: ScheduleTimelineRange,
): TimelineRangeBounds => {
  const year = anchorMonth.getFullYear();

  if (range === '3months') {
    const startMonth = quarterStartMonth(anchorMonth.getMonth());
    const start = new Date(year, startMonth, 1);
    start.setHours(0, 0, 0, 0);
    const end = monthEndDate(new Date(year, startMonth + 2, 1));
    return { start, end };
  }

  if (range === '6months') {
    const secondHalf = anchorMonth.getMonth() >= 6;
    const start = new Date(year, secondHalf ? 6 : 0, 1);
    start.setHours(0, 0, 0, 0);
    const end = monthEndDate(new Date(year, secondHalf ? 11 : 5, 1));
    return { start, end };
  }

  const start = new Date(year, anchorMonth.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = monthEndDate(anchorMonth);
  return { start, end };
};

export const formatTimelineRangeLabel = (
  anchorMonth: Date,
  range: ScheduleTimelineRange,
): string => {
  if (range === 'month') {
    return formatMonthYear(anchorMonth);
  }

  if (range === '3months') {
    const year = anchorMonth.getFullYear();
    const startMonth = quarterStartMonth(anchorMonth.getMonth());
    return `${MONTH_SHORT[startMonth]} – ${MONTH_SHORT[startMonth + 2]}, ${year}`;
  }

  if (range === '6months') {
    const year = anchorMonth.getFullYear();
    const secondHalf = anchorMonth.getMonth() >= 6;
    if (secondHalf) {
      return `${MONTH_SHORT[6]} – ${MONTH_SHORT[11]}, ${year}`;
    }
    return `${MONTH_SHORT[0]} – ${MONTH_SHORT[5]}, ${year}`;
  }

  const { start, end } = getTimelineRangeBounds(anchorMonth, range);
  const startLabel = `${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  const endLabel = `${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
};

export const shiftTimelineAnchor = (
  anchorMonth: Date,
  range: ScheduleTimelineRange,
  direction: -1 | 1,
): Date => {
  if (range === '3months') {
    const startMonth = quarterStartMonth(anchorMonth.getMonth());
    const shifted = shiftMonth(new Date(anchorMonth.getFullYear(), startMonth, 1), direction * 3);
    return new Date(shifted.getFullYear(), quarterStartMonth(shifted.getMonth()), 1);
  }

  if (range === '6months') {
    const year = anchorMonth.getFullYear();
    if (anchorMonth.getMonth() < 6) {
      return direction === 1
        ? new Date(year, 6, 1)
        : new Date(year - 1, 6, 1);
    }
    return direction === 1
      ? new Date(year + 1, 0, 1)
      : new Date(year, 0, 1);
  }

  return shiftMonth(anchorMonth, direction);
};

export const milestoneOverlapsTimelineRange = (
  milestoneStart: string,
  milestoneEnd: string,
  bounds: TimelineRangeBounds,
): boolean => {
  const start = parseIsoDate(milestoneStart).getTime();
  const end = parseIsoDate(milestoneEnd).getTime();
  return start <= bounds.end.getTime() && end >= bounds.start.getTime();
};

/** One column per calendar month (3-month / 6-month Gantt — Figma 468-5204). */
export const buildMonthColumnsForRange = (
  anchorMonth: Date,
  range: ScheduleTimelineRange,
): TimelineColumn[] => {
  const { start, end } = getTimelineRangeBounds(anchorMonth, range);
  const columns: TimelineColumn[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const monthStart = new Date(cursor);
    const monthEnd = monthEndDate(monthStart);
    columns.push({
      id: `month-${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: MONTH_NAMES[monthStart.getMonth()],
      start: monthStart,
      end: monthEnd,
    });
    cursor = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  }

  return columns;
};

/** Week columns for 1-month view; month columns for 3-month / 6-month. */
export const buildTimelineColumnsForRange = (
  anchorMonth: Date,
  range: ScheduleTimelineRange,
): TimelineColumn[] => {
  if (range === 'month') {
    return buildWeekColumns(anchorMonth, 6);
  }
  return buildMonthColumnsForRange(anchorMonth, range);
};

/** @deprecated Use buildTimelineColumnsForRange */
export const buildWeekColumnsForRange = buildTimelineColumnsForRange;
