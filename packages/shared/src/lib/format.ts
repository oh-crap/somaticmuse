// packages/shared/src/lib/format.ts
//
// Datetime formatting for Bucharest timezone.
// Extracted from inline formatters in Schedule.astro and admin/index.astro.

export type SupportedLocale = "ro-RO" | "en-US" | "en-GB";

/**
 * Format course date for public display ("luni, 10 iunie" / "Monday, 10 June").
 */
export function formatCourseDate(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Bucharest",
  }).format(new Date(iso));
}

/**
 * Format course time ("18:00").
 */
export function formatCourseTime(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Bucharest",
  }).format(new Date(iso));
}

/**
 * Format course range for one-line display ("18:00 — 19:30").
 */
export function formatCourseTimeRange(
  startIso: string,
  endIso: string,
  locale: SupportedLocale,
): string {
  return `${formatCourseTime(startIso, locale)} — ${formatCourseTime(endIso, locale)}`;
}

/**
 * Format datetime for admin list ("Mon, 10 Jun 2026, 18:00").
 */
export function formatAdminDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Bucharest",
  }).format(new Date(iso));
}

/**
 * Check if an ISO datetime string is in the past.
 */
export function isPast(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime();
}
/**
 * Format datetime for CRM list displays — like formatAdminDateTime but without year.
 * Output example: "Mon, 10 Jun, 18:00"
 */
export function formatCRMDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Bucharest",
  }).format(new Date(iso));
}

/**
 * Short date (day + month). Output example: "10 Jun".
 */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(iso));
}

/**
 * Relative time in plain English. Output: "today" / "1 day ago" / "N days ago".
 * Always backward-looking; future dates clamp to "today".
 */
export function daysAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
