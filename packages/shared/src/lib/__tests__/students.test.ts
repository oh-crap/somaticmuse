// packages/shared/src/lib/__tests__/students.test.ts
//
// Tests for sleeping client logic. Schema assumptions match students.ts header.
// All data is in-memory; no DB touched.

import { describe, it, expect } from "vitest";
import {
  isStudentSleeping,
  getSleepingStudents,
  sortStudentsAlphabetically,
  searchStudents,
  type StudentLike,
  type EnrollmentLike,
  type CourseLike,
} from "../students";

const makeStudent = (overrides: Partial<StudentLike> = {}): StudentLike => ({
  id: "s1",
  name: "Ana Popescu",
  holiday_until: null,
  ...overrides,
});

describe("isStudentSleeping", () => {
  const NOW = new Date("2026-06-08T10:00:00Z");

  it("returns true when student has no enrollments at all", () => {
    expect(
      isStudentSleeping({
        student: makeStudent(),
        enrollments: [],
        courses: [],
        now: NOW,
      }),
    ).toBe(true);
  });

  it("returns true when student has only future enrollments", () => {
    const student = makeStudent();
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-12-01T10:00:00Z" }, // future
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
    ];
    expect(isStudentSleeping({ student, enrollments, courses, now: NOW })).toBe(
      true,
    );
  });

  it("returns false when student attended a course within threshold (default 90 days)", () => {
    const student = makeStudent();
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-05-01T10:00:00Z" }, // ~37 days ago
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
    ];
    expect(isStudentSleeping({ student, enrollments, courses, now: NOW })).toBe(
      false,
    );
  });

  it("returns true when last attended course is older than threshold", () => {
    const student = makeStudent();
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-01-01T10:00:00Z" }, // ~158 days ago, > 90
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
    ];
    expect(isStudentSleeping({ student, enrollments, courses, now: NOW })).toBe(
      true,
    );
  });

  it("returns false when student is on holiday (holiday_until in future)", () => {
    const student = makeStudent({ holiday_until: "2026-08-01T00:00:00Z" });
    expect(
      isStudentSleeping({
        student,
        enrollments: [],
        courses: [],
        now: NOW,
      }),
    ).toBe(false);
  });

  it("ignores holiday_until that already passed", () => {
    const student = makeStudent({ holiday_until: "2026-01-01T00:00:00Z" }); // past
    expect(
      isStudentSleeping({
        student,
        enrollments: [],
        courses: [],
        now: NOW,
      }),
    ).toBe(true);
  });

  it("respects custom sleepingThresholdDays", () => {
    const student = makeStudent();
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-05-01T10:00:00Z" }, // ~37 days ago
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
    ];
    // With threshold 30 days, 37-day-old course is too old
    expect(
      isStudentSleeping({
        student,
        enrollments,
        courses,
        sleepingThresholdDays: 30,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("ignores enrollments of other students", () => {
    const student = makeStudent({ id: "s1" });
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-05-01T10:00:00Z" },
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "s2", course_id: "c1" },
    ];
    expect(isStudentSleeping({ student, enrollments, courses, now: NOW })).toBe(
      true,
    );
  });

  it("handles orphan enrollment (course not in catalog)", () => {
    const student = makeStudent();
    const courses: CourseLike[] = []; // course deleted
    const enrollments: EnrollmentLike[] = [
      { student_id: "s1", course_id: "c1" },
    ];
    expect(isStudentSleeping({ student, enrollments, courses, now: NOW })).toBe(
      true,
    );
  });
});

describe("getSleepingStudents", () => {
  const NOW = new Date("2026-06-08T10:00:00Z");

  it("returns empty when no students", () => {
    expect(getSleepingStudents([], [], [], { now: NOW })).toEqual([]);
  });

  it("filters to only sleeping students", () => {
    const students: StudentLike[] = [
      makeStudent({ id: "active", name: "Active" }),
      makeStudent({ id: "sleeping", name: "Sleeping" }),
      makeStudent({
        id: "holiday",
        name: "On holiday",
        holiday_until: "2026-08-01T00:00:00Z",
      }),
    ];
    const courses: CourseLike[] = [
      { id: "c1", end_at: "2026-05-01T10:00:00Z" }, // ~37 days ago
    ];
    const enrollments: EnrollmentLike[] = [
      { student_id: "active", course_id: "c1" },
    ];

    const result = getSleepingStudents(students, enrollments, courses, {
      now: NOW,
    });
    expect(result.map((s) => s.id)).toEqual(["sleeping"]);
  });
});

describe("sortStudentsAlphabetically", () => {
  it("sorts by name with locale-aware comparison", () => {
    const students = [
      makeStudent({ id: "1", name: "Štefan" }),
      makeStudent({ id: "2", name: "Ana" }),
      makeStudent({ id: "3", name: "Beáta" }),
    ];
    const sorted = sortStudentsAlphabetically(students);
    expect(sorted.map((s) => s.name)).toEqual(["Ana", "Beáta", "Štefan"]);
  });

  it("does not mutate input", () => {
    const students = [makeStudent({ name: "B" }), makeStudent({ name: "A" })];
    const original = students.map((s) => s.name);
    sortStudentsAlphabetically(students);
    expect(students.map((s) => s.name)).toEqual(original);
  });
});

describe("searchStudents", () => {
  const students = [
    makeStudent({ id: "1", name: "Ana Popescu" }),
    makeStudent({ id: "2", name: "Maria Ionescu" }),
    makeStudent({ id: "3", name: "Andrei Pop" }),
  ];

  it("returns all when query is empty", () => {
    expect(searchStudents(students, "").length).toBe(3);
  });

  it("returns all when query is whitespace", () => {
    expect(searchStudents(students, "   ").length).toBe(3);
  });

  it("matches substring case-insensitively", () => {
    expect(searchStudents(students, "pop").map((s) => s.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("returns empty when no match", () => {
    expect(searchStudents(students, "xyz")).toEqual([]);
  });
});
