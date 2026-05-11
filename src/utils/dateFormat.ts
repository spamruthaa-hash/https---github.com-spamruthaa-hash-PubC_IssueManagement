const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_INDEX = MONTHS.reduce<Record<string, number>>((acc, month, index) => {
  acc[month.toLowerCase()] = index;
  return acc;
}, {});

const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());

const expandYear = (year: string): number => {
  if (year.length === 2) {
    const value = Number(year);
    return value >= 70 ? 1900 + value : 2000 + value;
  }
  return Number(year);
};

const parseDateLike = (value: string | Date): Date | null => {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (!value.trim()) return null;

  // Supports existing article strings like "26 Jan 24 11:00" and "26 Jan 2024".
  const wordDate = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2}|\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
  if (wordDate) {
    const [, day, monthName, year] = wordDate;
    const monthIndex = MONTH_INDEX[monthName.slice(0, 3).toLowerCase()];
    if (monthIndex !== undefined) {
      const date = new Date(expandYear(year), monthIndex, Number(day), 12, 0, 0);
      return isValidDate(date) ? date : null;
    }
  }

  // Keep date-only values stable across time zones.
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return isValidDate(date) ? date : null;
  }

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : null;
};

const extractTime = (value: string | Date, fallback = ''): string => {
  if (value instanceof Date) return fallback;
  const match = value.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  return match?.[1] ?? fallback;
};

export const formatDisplayDate = (value: string | Date, fallback = '—'): string => {
  const date = parseDateLike(value);
  if (!date) return typeof value === 'string' && value ? value : fallback;
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDisplayDateTime = (
  value: string | Date,
  fallbackTime = '11:00',
  fallback = '—',
): string => {
  const dateText = formatDisplayDate(value, fallback);
  if (dateText === fallback || dateText === value) return dateText;
  const time = extractTime(value, fallbackTime);
  return time ? `${dateText} ${time}` : dateText;
};
