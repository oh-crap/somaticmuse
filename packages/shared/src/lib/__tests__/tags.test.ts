// packages/shared/src/lib/__tests__/tags.test.ts
//
// Tests for tag derivation and filtering. Schema assumptions match tags.ts header.

import { describe, it, expect } from "vitest";
import {
  deriveTagsFromEnrollments,
  mergeTagsForDisplay,
  matchesTagFilter,
  filterStudentsByTags,
  type TaggableCourse,
} from "../tags";
import type { EnrollmentLike } from "../students";

const makeCourse = (overrides: Partial<TaggableCourse> = {}): TaggableCourse => ({
  id: "c1",
  yoga_style: "Hatha",
  studio_name: "Studio A",
  format: "group",
  ...overrides,
});

describe("deriveTagsFromEnrollments", () => {
  it("returns empty when student has no enrollments", () => {
    const result = deriveTagsFromEnrollments("s1", [], [makeCourse()]);
    expect(result).toEqual([]);
  });

  it("derives three tags from a single enrollment", () => {
    const courses = [makeCourse({ id: "c1", yoga_style: "Hatha", studio_name: "Studio A", format: "group" })];
    const enrollments: EnrollmentLike[] = [{ student_id: "s1", course_id: "c1" }];
    const result = deriveTagsFromEnrollments("s1", enrollments, courses);

    expect(result).toEqual(
      expect.arrayContaining([
        { kind: "yoga_style", value: "Hatha" },
        { kind: "studio", value: "Studio A" },
        { kind: "format", value: "group" },
      ]),
    );
    expect(result).toHaveLength(3);
  });

  it("deduplicates identical tags from multiple enrollments in same studio + style", () => {
    const courses = [
      makeCourse({ id: "c1", yoga_style: "Hatha", studio_name: "Studio A", format: "group" }),
      makeCourse({ id: "c2", yoga_style: "Hatha", studio_name: "Studio A", format: "group" }),
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
      { student_id: "s1", course_id: "c2" },
    ];
    const result = deriveTagsFromEnrollments("s1", enrollments, courses);
    expect(result).toHaveLength(3); // Hatha, Studio A, group — once
  });

  it("includes distinct tags from different courses", () => {
    const courses = [
      makeCourse({ id: "c1", yoga_style: "Hatha", studio_name: "Studio A", format: "group" }),
      makeCourse({ id: "c2", yoga_style: "Vinyasa", studio_name: "Studio B", format: "individual" }),
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
      { student_id: "s1", course_id: "c2" },
    ];
    const result = deriveTagsFromEnrollments("s1", enrollments, courses);
    expect(result).toHaveLength(6);
    expect(result.map((t) => t.value)).toEqual(
      expect.arrayContaining(["Hatha", "Vinyasa", "Studio A", "Studio B", "group", "individual"]),
    );
  });

  it("ignores enrollments referring to missing courses", () => {
    const enrollments: EnrollmentLike[] = [{ student_id: "s1", course_id: "ghost" }];
    const result = deriveTagsFromEnrollments("s1", enrollments, []);
    expect(result).toEqual([]);
  });

  it("ignores enrollments of other students", () => {
    const courses = [makeCourse({ id: "c1" })];
    const enrollments: EnrollmentLike[] = [{ student_id: "s2", course_id: "c1" }];
    const result = deriveTagsFromEnrollments("s1", enrollments, courses);
    expect(result).toEqual([]);
  });
});

describe("mergeTagsForDisplay", () => {
  it("returns sorted union of auto + manual tags", () => {
    const auto = [
      { kind: "yoga_style" as const, value: "Vinyasa" },
      { kind: "studio" as const, value: "Studio A" },
    ];
    const manual = ["VIP", "Vinyasa"]; // "Vinyasa" duplicates auto
    const result = mergeTagsForDisplay(auto, manual);
    expect(result).toEqual(["Studio A", "Vinyasa", "VIP"]);
  });

  it("handles empty inputs", () => {
    expect(mergeTagsForDisplay([], [])).toEqual([]);
  });
});

describe("matchesTagFilter", () => {
  it("matches everyone when filter is empty", () => {
    expect(matchesTagFilter(["Hatha"], [], "AND")).toBe(true);
    expect(matchesTagFilter([], [], "OR")).toBe(true);
  });

  it("AND mode: all filter tags must be present", () => {
    expect(matchesTagFilter(["Hatha", "Studio A", "group"], ["Hatha", "Studio A"], "AND")).toBe(true);
    expect(matchesTagFilter(["Hatha", "Studio A"], ["Hatha", "Vinyasa"], "AND")).toBe(false);
  });

  it("OR mode: at least one filter tag must be present", () => {
    expect(matchesTagFilter(["Hatha"], ["Hatha", "Vinyasa"], "OR")).toBe(true);
    expect(matchesTagFilter(["Hatha"], ["Vinyasa", "Yin"], "OR")).toBe(false);
  });
});

describe("filterStudentsByTags", () => {
  interface TestStudent {
    id: string;
    tags: string[];
  }

  const students: TestStudent[] = [
    { id: "1", tags: ["Hatha", "Studio A"] },
    { id: "2", tags: ["Vinyasa", "Studio B"] },
    { id: "3", tags: ["Hatha", "Vinyasa", "Studio A"] },
  ];
  const getTags = (s: TestStudent) => s.tags;

  it("returns all students when filter is empty", () => {
    expect(filterStudentsByTags(students, [], "AND", getTags)).toHaveLength(3);
  });

  it("AND mode filters correctly", () => {
    const result = filterStudentsByTags(students, ["Hatha", "Studio A"], "AND", getTags);
    expect(result.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("OR mode filters correctly", () => {
    const result = filterStudentsByTags(students, ["Vinyasa"], "OR", getTags);
    expect(result.map((s) => s.id)).toEqual(["2", "3"]);
  });
});