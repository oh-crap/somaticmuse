// apps/admin/src/lib/dashboard/charts.ts
// Tile 5: Charts — monthly aggregations across a 12-month window.

import { supabaseAdmin } from "../supabase";

export interface MonthlyDataPoint {
  /** First day of the month, UTC */
  month: Date;
  /** Distinct students with ≥1 attendance in the month */
  unique_students: number;
  /** Total attendance rows in the month */
  total_visits: number;
  /** Distinct courses (lessons) in the month */
  lesson_count: number;
  /** Per-studio lesson count for this month */
  lessons_per_studio: Map<string, number>;
}

export interface ChartData {
  monthlyData: MonthlyDataPoint[];
  /** All studios that appeared at least once in the window, alphabetically sorted */
  allStudios: string[];
}

export async function fetchChartData(endMonth: Date): Promise<ChartData> {
  const windowStart = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - 11, 1),
  );
  const windowEnd = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 1),
  );

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, start_at, studio_name, course_students(student_id)")
    .gte("start_at", windowStart.toISOString())
    .lt("start_at", windowEnd.toISOString())
    .lt("start_at", nowIso);

  if (error) {
    console.error("[Dashboard:charts] Fetch failed:", error.message);
    return { monthlyData: emptySeries(windowStart, 12), allStudios: [] };
  }
  if (!data) {
    return { monthlyData: emptySeries(windowStart, 12), allStudios: [] };
  }

  type RawRow = {
    id: string;
    start_at: string;
    studio_name: string;
    course_students: Array<{ student_id: string }> | null;
  };

  type MonthBucket = {
    courses: Set<string>;
    students: Set<string>;
    visits: number;
    /** studio_name -> set of course IDs in that studio that month */
    studios: Map<string, Set<string>>;
  };

  const byMonth = new Map<string, MonthBucket>();
  const allStudiosSet = new Set<string>();

  for (const row of data as unknown as RawRow[]) {
    const d = new Date(row.start_at);
    const key = monthKey(d);
    allStudiosSet.add(row.studio_name);

    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = {
        courses: new Set(),
        students: new Set(),
        visits: 0,
        studios: new Map(),
      };
      byMonth.set(key, bucket);
    }

    bucket.courses.add(row.id);

    let studioSet = bucket.studios.get(row.studio_name);
    if (!studioSet) {
      studioSet = new Set();
      bucket.studios.set(row.studio_name, studioSet);
    }
    studioSet.add(row.id);

    const attendances = row.course_students ?? [];
    for (const att of attendances) {
      bucket.students.add(att.student_id);
      bucket.visits += 1;
    }
  }

  const monthlyData: MonthlyDataPoint[] = monthSeries(windowStart, 12).map(
    (month) => {
      const bucket = byMonth.get(monthKey(month));
      const lessons_per_studio = new Map<string, number>();
      if (bucket) {
        for (const [studio, courseSet] of bucket.studios) {
          lessons_per_studio.set(studio, courseSet.size);
        }
      }
      return {
        month,
        unique_students: bucket?.students.size ?? 0,
        total_visits: bucket?.visits ?? 0,
        lesson_count: bucket?.courses.size ?? 0,
        lessons_per_studio,
      };
    },
  );

  const allStudios = Array.from(allStudiosSet).sort((a, b) =>
    a.localeCompare(b),
  );

  return { monthlyData, allStudios };
}

// ----- helpers -----

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthSeries(start: Date, count: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    result.push(
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)),
    );
  }
  return result;
}

function emptySeries(start: Date, count: number): MonthlyDataPoint[] {
  return monthSeries(start, count).map((month) => ({
    month,
    unique_students: 0,
    total_visits: 0,
    lesson_count: 0,
    lessons_per_studio: new Map(),
  }));
}