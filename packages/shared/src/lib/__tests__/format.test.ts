// packages/shared/src/lib/__tests__/format.test.ts
//
// Note on assertions: Intl.DateTimeFormat output is stable per (locale, options)
// in modern Node (20+) with full ICU. We use regex matchers tolerant to
// whitespace variants (Intl may use narrow no-break space U+202F as separator).

import { describe, it, expect } from "vitest";
import {
  formatCourseDate,
  formatCourseTime,
  formatCourseTimeRange,
  formatAdminDateTime,
  isPast,
} from "../format";

// 2026-06-10T16:00:00Z = Wednesday, June 10 2026, 19:00 Bucharest (summer DST = UTC+3)
const SAMPLE_ISO = "2026-06-10T16:00:00Z";

describe("formatCourseDate", () => {
  it("formats Romanian locale with weekday + day + month", () => {
    const result = formatCourseDate(SAMPLE_ISO, "ro-RO");
    expect(result).toMatch(/miercuri/i);
    expect(result).toContain("10");
    expect(result).toMatch(/iunie/i);
  });

  it("formats English locale with weekday + day + month", () => {
    const result = formatCourseDate(SAMPLE_ISO, "en-US");
    expect(result).toMatch(/wednesday/i);
    expect(result).toContain("10");
    expect(result).toMatch(/june/i);
  });

  it("formats in Bucharest timezone (DST aware)", () => {
    // 23:30 UTC on June 10 = 02:30 Bucharest on June 11 (summer DST)
    const lateNightUtc = "2026-06-10T23:30:00Z";
    const result = formatCourseDate(lateNightUtc, "ro-RO");
    expect(result).toContain("11"); // day rolled to 11th in Bucharest
  });
});

describe("formatCourseTime", () => {
  it("formats time in 24-hour Bucharest local", () => {
    const result = formatCourseTime(SAMPLE_ISO, "ro-RO");
    expect(result).toMatch(/19[:.]?00/);
  });

  it("handles midnight Bucharest correctly", () => {
    // 21:00 UTC = 00:00 Bucharest (summer DST)
    const result = formatCourseTime("2026-06-10T21:00:00Z", "ro-RO");
    expect(result).toMatch(/00[:.]?00/);
  });
});

describe("formatCourseTimeRange", () => {
  it("returns 'start — end' with em dash", () => {
    const start = "2026-06-10T16:00:00Z"; // 19:00 Bucharest
    const end = "2026-06-10T17:30:00Z"; // 20:30 Bucharest
    const result = formatCourseTimeRange(start, end, "ro-RO");
    expect(result).toContain("—");
    expect(result).toMatch(/19[:.]?00/);
    expect(result).toMatch(/20[:.]?30/);
  });
});

describe("formatAdminDateTime", () => {
  it("includes weekday short, day, month short, year, and time", () => {
    const result = formatAdminDateTime(SAMPLE_ISO);
    expect(result).toMatch(/wed/i);
    expect(result).toContain("10");
    expect(result).toMatch(/jun/i);
    expect(result).toContain("2026");
    expect(result).toMatch(/19[:.]?00/);
  });
});

describe("isPast", () => {
  it("returns true for ISO in the past", () => {
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isPast("2026-06-01T10:00:00Z", now)).toBe(true);
  });

  it("returns false for ISO in the future", () => {
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isPast("2026-07-01T10:00:00Z", now)).toBe(false);
  });

  it("returns false for exactly now (strict less-than)", () => {
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isPast("2026-06-08T10:00:00Z", now)).toBe(false);
  });
});
