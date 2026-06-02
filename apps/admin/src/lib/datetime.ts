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
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - offset, minute));

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
