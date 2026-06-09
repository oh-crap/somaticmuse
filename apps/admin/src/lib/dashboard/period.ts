// apps/admin/src/lib/dashboard/period.ts
// URL param parsing for dashboard filters.
// All boundaries computed in UTC for simplicity. Lessons typically run
// 09:00–21:00 Bucharest, well outside the UTC/Bucharest midnight window
// where this approximation could differ — see /lib/datetime.ts DST notes.

export interface MonthPeriod {
  /** Inclusive start: YYYY-MM-01 00:00 UTC */
  start: Date;
  /** Exclusive end: first day of next month, 00:00 UTC */
  end: Date;
  /** Human label, e.g. "May 2026" */
  label: string;
  /** Value for <input type="month">, e.g. "2026-05" */
  value: string;
}

export interface DateRange {
  /** Inclusive start, 00:00 UTC */
  from: Date;
  /** Exclusive end, 00:00 UTC of day AFTER `to` */
  to: Date;
  /** Value for <input type="date">, e.g. "2026-06-09" */
  fromValue: string;
  toValue: string;
}

export interface Pagination {
  /** 1-indexed page number */
  page: number;
  /** Items per page */
  perPage: number;
  /** 0-indexed offset for SQL/array slicing */
  offset: number;
}

/**
 * Parse a "YYYY-MM" string into a month period.
 * Falls back to the previous calendar month if input is null/invalid.
 */
export function parseMonth(raw: string | null | undefined): MonthPeriod {
  let year: number;
  let month: number; // 1-12

  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return previousMonth();
    }
  } else {
    return previousMonth();
  }

  return buildMonthPeriod(year, month);
}

/**
 * Parse two "YYYY-MM-DD" strings into a date range.
 * Defaults to today−365 days through today (both inclusive).
 */
export function parseDateRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
): DateRange {
  const today = startOfTodayUTC();
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 365);

  const from = parseDateOrFallback(fromRaw, defaultFrom);
  const to = parseDateOrFallback(toRaw, today);

  // Guard against from > to: swap silently
  const [start, end] = from <= to ? [from, to] : [to, from];

  // Exclusive end = day after `to`
  const exclusiveEnd = new Date(end);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);

  return {
    from: start,
    to: exclusiveEnd,
    fromValue: formatDate(start),
    toValue: formatDate(end),
  };
}

/**
 * Parse a page number string into pagination state.
 */
export function parsePagination(
  raw: string | null | undefined,
  perPage: number = 10,
): Pagination {
  const n = Number(raw);
  const page = Number.isInteger(n) && n >= 1 ? n : 1;
  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  };
}

// ----- helpers -----

function previousMonth(): MonthPeriod {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed, so this is "current - 1" when used as 1-indexed
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return buildMonthPeriod(year, month);
}

function buildMonthPeriod(year: number, month: number): MonthPeriod {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const label = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
  const value = `${year}-${String(month).padStart(2, "0")}`;
  return { start, end, label, value };
}

function parseDateOrFallback(raw: string | null | undefined, fallback: Date): Date {
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return fallback;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(d.getTime())) return fallback;
  return d;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}