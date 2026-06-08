// packages/shared/src/lib/__tests__/courses.test.ts
import { describe, it, expect } from "vitest";
import {
  isCourseUpcoming,
  filterUpcomingCourses,
  isCourseEnrollable,
} from "../courses";
import type { Course } from "../../types";

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: "test-id",
  title: "Test course",
  yoga_style: "Hatha",
  format: "group",
  start_at: "2026-06-10T18:00:00Z",
  end_at: "2026-06-10T19:30:00Z",
  studio_name: "Test studio",
  studio_address: "Test address",
  booking_url: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...overrides,
});

describe("isCourseUpcoming", () => {
  it("returns true for a course in the future", () => {
    const course = makeCourse({ end_at: "2026-07-01T19:30:00Z" });
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isCourseUpcoming(course, now)).toBe(true);
  });

  it("returns true for a course that ended earlier today (before midnight)", () => {
    const course = makeCourse({ end_at: "2026-06-08T08:00:00Z" });
    const now = new Date("2026-06-08T20:00:00Z");
    expect(isCourseUpcoming(course, now)).toBe(true);
  });

  it("returns false for a course that ended yesterday", () => {
    const course = makeCourse({ end_at: "2026-06-07T20:00:00Z" });
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isCourseUpcoming(course, now)).toBe(false);
  });

  it("handles edge case: course ending exactly at midnight", () => {
    const course = makeCourse({ end_at: "2026-06-08T00:00:00Z" });
    const now = new Date("2026-06-08T12:00:00Z");
    expect(isCourseUpcoming(course, now)).toBe(true);
  });
});

describe("filterUpcomingCourses", () => {
  it("returns empty array when input is empty", () => {
    expect(filterUpcomingCourses([])).toEqual([]);
  });

  it("filters out past courses and sorts by start_at", () => {
    const courses = [
      makeCourse({
        id: "future-2",
        start_at: "2026-07-15T18:00:00Z",
        end_at: "2026-07-15T19:30:00Z",
      }),
      makeCourse({
        id: "past",
        start_at: "2026-06-01T18:00:00Z",
        end_at: "2026-06-01T19:30:00Z",
      }),
      makeCourse({
        id: "future-1",
        start_at: "2026-07-01T18:00:00Z",
        end_at: "2026-07-01T19:30:00Z",
      }),
    ];
    const now = new Date("2026-06-08T10:00:00Z");
    const result = filterUpcomingCourses(courses, now);

    expect(result.map((c) => c.id)).toEqual(["future-1", "future-2"]);
  });

  it("does not mutate input array", () => {
    const courses = [
      makeCourse({
        id: "a",
        start_at: "2026-07-15T18:00:00Z",
        end_at: "2026-07-15T19:30:00Z",
      }),
      makeCourse({
        id: "b",
        start_at: "2026-07-01T18:00:00Z",
        end_at: "2026-07-01T19:30:00Z",
      }),
    ];
    const originalOrder = courses.map((c) => c.id);
    filterUpcomingCourses(courses);
    expect(courses.map((c) => c.id)).toEqual(originalOrder);
  });
});

describe("isCourseEnrollable", () => {
  it("returns true for course that started today", () => {
    const course = makeCourse({ start_at: "2026-06-08T18:00:00Z" });
    const now = new Date("2026-06-08T20:00:00Z");
    expect(isCourseEnrollable(course, now)).toBe(true);
  });

  it("returns true for course that started 1 day ago", () => {
    const course = makeCourse({ start_at: "2026-06-07T18:00:00Z" });
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isCourseEnrollable(course, now)).toBe(true);
  });

  it("returns false for course that started 3 days ago", () => {
    const course = makeCourse({ start_at: "2026-06-05T18:00:00Z" });
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isCourseEnrollable(course, now)).toBe(false);
  });

  it("returns true for future courses", () => {
    const course = makeCourse({ start_at: "2026-07-01T18:00:00Z" });
    const now = new Date("2026-06-08T10:00:00Z");
    expect(isCourseEnrollable(course, now)).toBe(true);
  });
});
