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
