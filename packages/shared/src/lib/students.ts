// packages/shared/src/lib/students.ts
// Sleeping clients logic:
//   A student is "sleeping" if they have NO enrolled course that already happened
//   in the last `sleepingThresholdDays` days, AND their holiday_until is not in the future.
//
// Important: only PAST courses count toward "active". Future enrollments don't
// rescue a sleeping student — they need to have actually attended recently.

export interface StudentLike {
  id: string;
  name: string;
  holiday_until: string | null;
}

export interface EnrollmentLike {
  student_id: string;
  course_id: string;
}

export interface CourseLike {
  id: string;
  end_at: string;
}

export interface SleepingCheckInput {
  student: StudentLike;
  enrollments: EnrollmentLike[];
  courses: CourseLike[];
  sleepingThresholdDays?: number; // default 90
  now?: Date;
}

/**
 * Returns true if student is "sleeping" — no recent past attendance,
 * not on declared holiday.
 */
export function isStudentSleeping(input: SleepingCheckInput): boolean {
  const { student, enrollments, courses, sleepingThresholdDays = 90, now = new Date() } = input;

  // Holiday override: if holiday_until is in the future, student is "on pause", not sleeping.
  if (student.holiday_until) {
    const holidayEnd = new Date(student.holiday_until);
    if (holidayEnd.getTime() > now.getTime()) {
      return false;
    }
  }

  // Threshold: how far back a course can be to count as "recent activity".
  const thresholdMs = sleepingThresholdDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - thresholdMs);

  // Build lookup of past course end times by id.
  const pastCourseEnds = new Map<string, Date>();
  for (const course of courses) {
    const end = new Date(course.end_at);
    if (end.getTime() < now.getTime()) {
      pastCourseEnds.set(course.id, end);
    }
  }

  // Did this student attend any past course after the cutoff?
  const studentEnrollments = enrollments.filter((e) => e.student_id === student.id);
  for (const enrollment of studentEnrollments) {
    const courseEnd = pastCourseEnds.get(enrollment.course_id);
    if (courseEnd && courseEnd.getTime() >= cutoff.getTime()) {
      return false; // Recent activity found.
    }
  }

  return true; // No recent activity and no active holiday.
}

/**
 * Returns subset of students that are currently sleeping.
 */
export function getSleepingStudents(
  students: StudentLike[],
  enrollments: EnrollmentLike[],
  courses: CourseLike[],
  options: { sleepingThresholdDays?: number; now?: Date } = {},
): StudentLike[] {
  return students.filter((student) =>
    isStudentSleeping({
      student,
      enrollments,
      courses,
      sleepingThresholdDays: options.sleepingThresholdDays,
      now: options.now,
    }),
  );
}

/**
 * Sort students alphabetically by name, locale-aware (RO/CZ diacritics handled).
 */
export function sortStudentsAlphabetically<T extends { name: string }>(
  students: T[],
  locale: string = "ro-RO",
): T[] {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));
}

/**
 * Case-insensitive substring search across student name.
 * Extend if you want to search across email/phone/notes — add fields to the union.
 */
export function searchStudents<T extends { name: string }>(students: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return students;
  return students.filter((s) => s.name.toLowerCase().includes(trimmed));
}