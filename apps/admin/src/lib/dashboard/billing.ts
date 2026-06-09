// apps/admin/src/lib/dashboard/billing.ts
// Tile 1: Billing — data fetch + aggregation.
//
// For a given calendar month, returns courses that have already happened
// (start_at < now()), grouped by studio_name alphabetically. Each course
// includes its attendance count from course_students.

import { supabaseAdmin } from "../supabase";

export interface BillingLesson {
  course_id: string;
  title: string;
  start_at: string;
  student_count: number;
}

export interface BillingStudio {
  studio_name: string;
  course_count: number;
  lessons: BillingLesson[];
}

export interface BillingResult {
  studios: BillingStudio[];
  total_lessons: number;
  total_attendees: number;
}

/**
 * Fetch billing data for the given month.
 *
 * @param monthStart - inclusive start (UTC midnight of first day of month)
 * @param monthEnd - exclusive end (UTC midnight of first day of next month)
 * @param hideEmpty - if true, filter out lessons with 0 attendees
 */
export async function fetchBillingData(
  monthStart: Date,
  monthEnd: Date,
  hideEmpty: boolean,
): Promise<BillingResult> {
  // Exclude future lessons even if they fall in the picked month.
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, title, start_at, studio_name, course_students(student_id)")
    .gte("start_at", monthStart.toISOString())
    .lt("start_at", monthEnd.toISOString())
    .lt("start_at", nowIso)
    .order("studio_name", { ascending: true })
    .order("start_at", { ascending: true });

  if (error) {
    console.error("[Dashboard:billing] Fetch failed:", error.message);
    return { studios: [], total_lessons: 0, total_attendees: 0 };
  }

  if (!data) {
    return { studios: [], total_lessons: 0, total_attendees: 0 };
  }

  // Flatten Supabase nested select. course_students arrives as array of
  // { student_id }; we only need its length for the attendance count.
  type RawRow = {
    id: string;
    title: string;
    start_at: string;
    studio_name: string;
    course_students: Array<{ student_id: string }> | null;
  };

  const lessons: Array<{ studio_name: string } & BillingLesson> = (
    data as unknown as RawRow[]
  ).map((row) => ({
    studio_name: row.studio_name,
    course_id: row.id,
    title: row.title,
    start_at: row.start_at,
    student_count: Array.isArray(row.course_students)
      ? row.course_students.length
      : 0,
  }));

  const filtered = hideEmpty
    ? lessons.filter((l) => l.student_count > 0)
    : lessons;

  // Group by studio_name (case-sensitive per design — surfaces typos
  // rather than silently merging them).
  const byStudio = new Map<string, BillingLesson[]>();
  for (const lesson of filtered) {
    const list = byStudio.get(lesson.studio_name) ?? [];
    list.push({
      course_id: lesson.course_id,
      title: lesson.title,
      start_at: lesson.start_at,
      student_count: lesson.student_count,
    });
    byStudio.set(lesson.studio_name, list);
  }

  // Alphabetical, locale-aware sort
  const studios: BillingStudio[] = Array.from(byStudio.entries())
    .map(([studio_name, studioLessons]) => ({
      studio_name,
      course_count: studioLessons.length,
      lessons: studioLessons,
    }))
    .sort((a, b) => a.studio_name.localeCompare(b.studio_name));

  const total_lessons = filtered.length;
  const total_attendees = filtered.reduce((sum, l) => sum + l.student_count, 0);

  return { studios, total_lessons, total_attendees };
}
