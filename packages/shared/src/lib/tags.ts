// packages/shared/src/lib/tags.ts
import type { CourseFormat } from "../types";
import type { EnrollmentLike } from "./students";

export type TagKind = "yoga_style" | "studio" | "format";

export interface DerivedTag {
  kind: TagKind;
  value: string;
}

export interface TaggableCourse {
  id: string;
  yoga_style: string;
  studio_name: string;
  format: CourseFormat;
}

/**
 * Derive auto-tags for a single student from their enrollments + course catalog.
 * Returns deduplicated tags across all three kinds (yoga_style, studio, format).
 */
export function deriveTagsFromEnrollments(
  studentId: string,
  enrollments: EnrollmentLike[],
  courses: TaggableCourse[],
): DerivedTag[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const studentEnrollments = enrollments.filter((e) => e.student_id === studentId);

  const seen = new Set<string>(); // dedup key: "kind:value"
  const tags: DerivedTag[] = [];

  for (const enrollment of studentEnrollments) {
    const course = courseMap.get(enrollment.course_id);
    if (!course) continue;

    const candidates: DerivedTag[] = [
      { kind: "yoga_style", value: course.yoga_style },
      { kind: "studio", value: course.studio_name },
      { kind: "format", value: course.format },
    ];

    for (const tag of candidates) {
      const key = `${tag.kind}:${tag.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    }
  }

  return tags;
}

/**
 * Merge auto-derived tags with manual tags.
 * Manual tags are kind-less strings; they're treated as a separate "manual" bucket.
 * Returns a flat string[] for filter UI display (e.g. "Hatha", "Studio X", "group", "VIP").
 */
export function mergeTagsForDisplay(autoTags: DerivedTag[], manualTags: string[]): string[] {
  const all = new Set<string>();
  for (const t of autoTags) all.add(t.value);
  for (const m of manualTags) all.add(m);
  return Array.from(all).sort((a, b) => a.localeCompare(b));
}

/**
 * Match a student's combined tags against a filter set.
 * - "AND": student must have ALL filter tags
 * - "OR":  student must have AT LEAST ONE filter tag
 * Empty filter set = match everyone.
 */
export type FilterMode = "AND" | "OR";

export function matchesTagFilter(
  studentTags: string[],
  filterTags: string[],
  mode: FilterMode,
): boolean {
  if (filterTags.length === 0) return true;

  const studentSet = new Set(studentTags);
  if (mode === "AND") {
    return filterTags.every((f) => studentSet.has(f));
  } else {
    return filterTags.some((f) => studentSet.has(f));
  }
}

/**
 * Filter a list of students by tag criteria.
 * Caller provides a function to get tags for each student (since tags are derived).
 */
export function filterStudentsByTags<S>(
  students: S[],
  filterTags: string[],
  mode: FilterMode,
  getTagsForStudent: (student: S) => string[],
): S[] {
  if (filterTags.length === 0) return students;
  return students.filter((s) => matchesTagFilter(getTagsForStudent(s), filterTags, mode));
}