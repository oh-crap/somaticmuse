// apps/admin/src/lib/dashboard/dropouts.ts
// Tile 4: Dropouts — irregular attendance + declining activity.

import { supabaseAdmin } from "../supabase";

export type DropoutsType = "irregular" | "declining";

export interface IrregularRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  /** Distinct ISO weeks (Mon-Sun) with ≥1 attendance in last 91 days (capped at 13) */
  active_weeks: number;
  /** 13 - active_weeks */
  inactive_weeks: number;
  /** active_weeks / 13, rounded to 2 decimals */
  activity_coefficient: number;
  /** Absolute last past lesson, may be outside the 91-day window */
  last_lesson_at: string | null;
}

export interface DecliningRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  /** Attendances in [today-182, today-91) */
  prev_count: number;
  /** Attendances in [today-91, today) */
  curr_count: number;
  /** prev_count - curr_count, always >= DECLINING_THRESHOLD */
  drop: number;
  last_lesson_at: string | null;
}

export const DROPOUTS_PER_PAGE = 10;
export const WEEKS_IN_WINDOW = 13;
const WINDOW_DAYS = 91;
const DECLINING_THRESHOLD = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- Internal: shared fetch + enrichment ----

interface EnrichedStudent {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  /** All past attendance start_at ISO strings, sorted descending */
  past_attendance_iso: string[];
}

async function fetchActiveStudentsWithAttendance(): Promise<EnrichedStudent[]> {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      "id, first_name, last_name, photo_url, holiday_until, course_students(courses(start_at))",
    )
    .eq("active", true);

  if (error) {
    console.error("[Dashboard:dropouts] Fetch failed:", error.message);
    return [];
  }
  if (!data) return [];

  type RawCS = { courses: { start_at: string } | null };
  type RawRow = {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    holiday_until: string | null;
    course_students: RawCS[] | null;
  };

  const enriched: EnrichedStudent[] = [];
  for (const student of data as unknown as RawRow[]) {
    if (student.holiday_until && student.holiday_until >= today) continue;

    const past: string[] = [];
    for (const cs of student.course_students ?? []) {
      const sa = cs.courses?.start_at;
      if (sa && sa < nowIso) past.push(sa);
    }
    past.sort((a, b) => b.localeCompare(a)); // descending

    enriched.push({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      photo_url: student.photo_url,
      past_attendance_iso: past,
    });
  }
  return enriched;
}

// ---- Public: irregular ----

export async function fetchIrregularData(
  page: number,
): Promise<{ rows: IrregularRow[]; total: number }> {
  const students = await fetchActiveStudentsWithAttendance();
  const sorted = buildIrregularList(students);
  return paginate(sorted, page);
}

function buildIrregularList(students: EnrichedStudent[]): IrregularRow[] {
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * DAY_MS;

  // Exclude students who have NEVER attended a lesson — those belong in
  // Tile 3 (no-lesson), not here. Keeps the two tiles conceptually distinct.
  const eligible = students.filter((s) => s.past_attendance_iso.length > 0);

  const result: IrregularRow[] = eligible.map((s) => {
    const weeks = new Set<string>();
    for (const iso of s.past_attendance_iso) {
      const t = Date.parse(iso);
      if (t >= windowStart && t < now) {
        weeks.add(mondayKey(new Date(t)));
      }
    }
    const active_weeks = Math.min(WEEKS_IN_WINDOW, weeks.size);
    const inactive_weeks = WEEKS_IN_WINDOW - active_weeks;
    const activity_coefficient =
      Math.round((active_weeks / WEEKS_IN_WINDOW) * 100) / 100;

    return {
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      photo_url: s.photo_url,
      active_weeks,
      inactive_weeks,
      activity_coefficient,
      last_lesson_at: s.past_attendance_iso[0] ?? null,
    };
  });

  // Sort: highest inactive_weeks first, tie-break by last_lesson_at DESC
  result.sort((a, b) => {
    if (a.inactive_weeks !== b.inactive_weeks) {
      return b.inactive_weeks - a.inactive_weeks;
    }
    return compareLastLessonDesc(a.last_lesson_at, b.last_lesson_at);
  });

  return result;
}

// ---- Public: declining ----

export async function fetchDecliningData(
  page: number,
): Promise<{ rows: DecliningRow[]; total: number }> {
  const students = await fetchActiveStudentsWithAttendance();
  const sorted = buildDecliningList(students);
  return paginate(sorted, page);
}

function buildDecliningList(students: EnrichedStudent[]): DecliningRow[] {
  const now = Date.now();
  const currStart = now - WINDOW_DAYS * DAY_MS;
  const prevStart = now - 2 * WINDOW_DAYS * DAY_MS;

  const result: DecliningRow[] = [];

  for (const s of students) {
    let curr = 0;
    let prev = 0;
    for (const iso of s.past_attendance_iso) {
      const t = Date.parse(iso);
      if (t >= currStart && t < now) curr += 1;
      else if (t >= prevStart && t < currStart) prev += 1;
    }
    const drop = prev - curr;
    // Per Q7 refinement: only drops of 3+ lessons qualify.
    // Excludes 9→7 (drop 2), 2→0 (drop 2), includes 15→0 (drop 15).
    if (drop < DECLINING_THRESHOLD) continue;

    result.push({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      photo_url: s.photo_url,
      prev_count: prev,
      curr_count: curr,
      drop,
      last_lesson_at: s.past_attendance_iso[0] ?? null,
    });
  }

  // Sort: largest drop first, tie-break by last_lesson_at DESC
  result.sort((a, b) => {
    if (a.drop !== b.drop) return b.drop - a.drop;
    return compareLastLessonDesc(a.last_lesson_at, b.last_lesson_at);
  });

  return result;
}

// ---- helpers ----

/** Returns YYYY-MM-DD of the Monday of the ISO week containing `d`. */
function mondayKey(d: Date): string {
  const tmp = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = tmp.getUTCDay() || 7; // Sunday = 7 in ISO
  tmp.setUTCDate(tmp.getUTCDate() - (day - 1));
  return tmp.toISOString().slice(0, 10);
}

/** More recent last_lesson_at first; nulls last. */
function compareLastLessonDesc(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

function paginate<T>(list: T[], page: number): { rows: T[]; total: number } {
  const total = list.length;
  const offset = (Math.max(1, page) - 1) * DROPOUTS_PER_PAGE;
  return { rows: list.slice(offset, offset + DROPOUTS_PER_PAGE), total };
}
