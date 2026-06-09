// apps/admin/src/lib/dashboard/lessons.ts
// Tile 3: No-lesson / single-lesson students.

import { supabaseAdmin } from "../supabase";

export type LessonsFilterType = "none" | "single";
export type LessonsSortType = "recent" | "alpha";

export interface LessonsStudentRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  created_at: string;
  /** Only set for "single" type; null for "none" */
  last_lesson_at: string | null;
}

export interface LessonsResult {
  rows: LessonsStudentRow[];
  total: number;
}

export const LESSONS_PER_PAGE = 10;

/**
 * Fetch students matching the given lesson-count filter, sorted and paginated.
 *
 * Past lesson = course_students row whose joined course has start_at < now().
 * Excludes inactive students and students on holiday (holiday_until >= today).
 */
export async function fetchLessonsData(
  filterType: LessonsFilterType,
  sortType: LessonsSortType,
  page: number,
): Promise<LessonsResult> {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10); // YYYY-MM-DD for date column comparison

  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      "id, first_name, last_name, photo_url, created_at, holiday_until, course_students(courses(start_at))",
    )
    .eq("active", true);

  if (error) {
    console.error("[Dashboard:lessons] Fetch failed:", error.message);
    return { rows: [], total: 0 };
  }

  if (!data) {
    return { rows: [], total: 0 };
  }

  type RawCS = { courses: { start_at: string } | null };
  type RawRow = {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    created_at: string;
    holiday_until: string | null;
    course_students: RawCS[] | null;
  };

  type Augmented = LessonsStudentRow & { past_count: number };

  // Filter on-holiday students + compute past-attendance stats
  const augmented: Augmented[] = [];

  for (const student of data as unknown as RawRow[]) {
    // Skip students currently on holiday
    if (student.holiday_until && student.holiday_until >= today) {
      continue;
    }

    let past_count = 0;
    let last_lesson_at: string | null = null;

    for (const cs of student.course_students ?? []) {
      const startAt = cs.courses?.start_at;
      if (startAt && startAt < nowIso) {
        past_count += 1;
        if (last_lesson_at === null || startAt > last_lesson_at) {
          last_lesson_at = startAt;
        }
      }
    }

    augmented.push({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      photo_url: student.photo_url,
      created_at: student.created_at,
      last_lesson_at,
      past_count,
    });
  }

  // Apply lesson-count filter
  const targetCount = filterType === "none" ? 0 : 1;
  const filtered = augmented.filter((s) => s.past_count === targetCount);

  // Sort
  const sorted = [...filtered];
  if (sortType === "recent") {
    sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else {
    sorted.sort((a, b) => {
      const cmp = a.last_name.localeCompare(b.last_name);
      return cmp !== 0 ? cmp : a.first_name.localeCompare(b.first_name);
    });
  }

  const total = sorted.length;
  const offset = (page - 1) * LESSONS_PER_PAGE;
  const pageSlice = sorted.slice(offset, offset + LESSONS_PER_PAGE);

  // Strip past_count from rows before returning
  const rows: LessonsStudentRow[] = pageSlice.map(
    ({ past_count: _omit, ...rest }) => rest,
  );

  return { rows, total };
}