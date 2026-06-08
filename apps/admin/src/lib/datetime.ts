const BUCHAREST_TZ = "Europe/Bucharest";

/**
 * Compute the UTC offset (in hours) for Europe/Bucharest on a given date.
 * Uses formatToParts to extract hour deterministically (avoids locale quirks).
 */
function getBucharestOffset(year: number, month: number, day: number): number {
  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUCHAREST_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(refDate);

  const hourPart = parts.find((p) => p.type === "hour");
  if (!hourPart) {
    throw new Error("Failed to determine Bucharest timezone offset");
  }
  const bucharestHour = Number(hourPart.value);
  return bucharestHour - 12;
}

/**
 * Parse datetime-local input "YYYY-MM-DDTHH:MM" as Bucharest TZ
 * and return ISO UTC string.
 *
 * KNOWN LIMITATION — DST transition days:
 * On the two days per year when Bucharest changes between EET (UTC+2)
 * and EEST (UTC+3), times in the 02:00-04:00 local window are either
 * non-existent (spring forward, last Sunday of March) or ambiguous
 * (fall back, last Sunday of October). This function uses a fixed
 * per-day offset and will silently shift such inputs by one hour.
 *
 * Accepted as a known limitation because yoga courses are not scheduled
 * in the small hours. Fix would require a round-trip validation (see
 * git history for the discussion) or a tz-aware library (Temporal,
 * date-fns-tz).
 */
export function parseBucharestDateTime(input: string): string {
  if (!input) return "";

  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid datetime format: ${input}`);
  }

  const [, y, m, d, h, mi] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);

  const offset = getBucharestOffset(year, month, day);
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hour - offset, minute),
  );

  return utcDate.toISOString();
}

/**
 * Format ISO UTC datetime as "YYYY-MM-DDTHH:MM" in Bucharest TZ
 * (suitable for datetime-local input value).
 */
export function formatForInput(iso: string): string {
  if (!iso) return "";

  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BUCHAREST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
