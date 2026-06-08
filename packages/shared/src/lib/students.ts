// packages/shared/src/lib/students.ts
//
// Pure helpers for student display.
//
// CRM data access (search, filter by tags, sleeping clients) lives at the
// DB layer (ilike queries, student_tags joins, sleeping_students view).
// This module is intentionally small — only what's reused across pages.

export interface StudentNameLike {
  first_name: string;
  last_name: string;
}

/**
 * Two-letter initials from first + last name (e.g. "AP" for Ana Popescu).
 * Empty name parts produce empty initials.
 */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Display name "First Last".
 */
export function displayStudentName(student: StudentNameLike): string {
  return `${student.first_name} ${student.last_name}`;
}

/**
 * Sort students by last name then first name, locale-aware (RO/CZ diacritics).
 *
 * Used when client-side sorting is required because the DB query couldn't
 * sort fully — e.g. OR-mode tag filter that aggregates rows across multiple
 * student_tags joins.
 */
export function sortStudentsByLastName<T extends StudentNameLike>(
  students: T[],
  locale: string = "ro-RO",
): T[] {
  return [...students].sort((a, b) => {
    const last = a.last_name.localeCompare(b.last_name, locale, {
      sensitivity: "base",
    });
    if (last !== 0) return last;
    return a.first_name.localeCompare(b.first_name, locale, {
      sensitivity: "base",
    });
  });
}
