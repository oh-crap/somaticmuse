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
}

/**
 * Fetch monthly aggregations for 12 months ending at `endMonth` (inclusive).
 *
 * @param endMonth - UTC first-of-month for the LAST month in the window
 * @returns 12 ordered data points, oldest first; missing months padded with zeros
 */
export async function fetchChartData(
  endMonth: Date,
): Promise<MonthlyDataPoint[]> {
  // Window: 11 months before endMonth through endMonth (inclusive) = 12 months total
  const windowStart = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - 11, 1),
  );
  // Exclusive end = first day of month AFTER endMonth
  const windowEnd = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 1),
  );

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, start_at, course_students(student_id)")
    .gte("start_at", windowStart.toISOString())
    .lt("start_at", windowEnd.toISOString())
    .lt("start_at", nowIso);

  if (error) {
    console.error("[Dashboard:charts] Fetch failed:", error.message);
    return emptySeries(windowStart, 12);
  }

  if (!data) {
    return emptySeries(windowStart, 12);
  }

  type RawRow = {
    id: string;
    start_at: string;
    course_students: Array<{ student_id: string }> | null;
  };

  type MonthBucket = {
    courses: Set<string>;
    students: Set<string>;
    visits: number;
  };

  // Bucket courses by YYYY-MM
  const byMonth = new Map<string, MonthBucket>();

  for (const row of data as unknown as RawRow[]) {
    const d = new Date(row.start_at);
    const key = monthKey(d);

    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = { courses: new Set(), students: new Set(), visits: 0 };
      byMonth.set(key, bucket);
    }

    bucket.courses.add(row.id);

    const attendances = row.course_students ?? [];
    for (const att of attendances) {
      bucket.students.add(att.student_id);
      bucket.visits += 1;
    }
  }

  // Pad to 12 months in chronological order
  return monthSeries(windowStart, 12).map((month) => {
    const bucket = byMonth.get(monthKey(month));
    return {
      month,
      unique_students: bucket?.students.size ?? 0,
      total_visits: bucket?.visits ?? 0,
      lesson_count: bucket?.courses.size ?? 0,
    };
  });
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
  }));
}