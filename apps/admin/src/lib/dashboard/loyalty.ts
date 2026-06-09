// apps/admin/src/lib/dashboard/loyalty.ts
// Tile 2: Loyalty / Retention.
//
// Three retention views over a date range:
//   1. Total: all students with ≥1 attendance in period
//   2. Per-studio: ONLY students exclusive to that studio (1 distinct studio in period)
//   3. Loyal: students who visited 2+ distinct studios in period
//
// Cumulative buckets (1+ implicit as total, then 2+, 3+, 5+, 10+ courses).
// Loyal students also bucketed by studio count: 2, 3-4, 5+.

import { supabaseAdmin } from "../supabase";

export interface RetentionBuckets {
  /** Students with ≥1 course in this segment */
  total: number;
  bucket_2_plus: number;
  bucket_3_plus: number;
  bucket_5_plus: number;
  bucket_10_plus: number;
}

export interface StudioRetention extends RetentionBuckets {
  studio_name: string;
}

export interface LoyalStudioBuckets {
  two: number;
  three_to_four: number;
  five_plus: number;
}

export interface LoyaltyData {
  totalRetention: RetentionBuckets;
  /** Alphabetical; includes studios that had ≥1 course in period even if 0 exclusive students */
  perStudio: StudioRetention[];
  loyalRetention: RetentionBuckets;
  loyalStudioBuckets: LoyalStudioBuckets;
  /** = totalRetention.total - loyalRetention.total */
  exclusive_students: number;
}

export async function fetchLoyaltyData(
  from: Date,
  to: Date,
): Promise<LoyaltyData> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, studio_name, course_students(student_id)")
    .gte("start_at", from.toISOString())
    .lt("start_at", to.toISOString())
    .lt("start_at", nowIso);

  if (error) {
    console.error("[Dashboard:loyalty] Fetch failed:", error.message);
    return emptyResult();
  }
  if (!data) return emptyResult();

  type RawRow = {
    id: string;
    studio_name: string;
    course_students: Array<{ student_id: string }> | null;
  };

  // Aggregate: student_id -> (studio_name -> attendance count in period)
  const perStudent = new Map<string, Map<string, number>>();
  const allStudiosInPeriod = new Set<string>();

  for (const row of data as unknown as RawRow[]) {
    allStudiosInPeriod.add(row.studio_name);
    for (const cs of row.course_students ?? []) {
      let studios = perStudent.get(cs.student_id);
      if (!studios) {
        studios = new Map();
        perStudent.set(cs.student_id, studios);
      }
      studios.set(row.studio_name, (studios.get(row.studio_name) ?? 0) + 1);
    }
  }

  // Classify each student
  type Classified = {
    total_courses: number;
    distinct_studios: number;
    is_loyal: boolean;
    /** For exclusive students (1 studio): their single studio name */
    exclusive_studio: string | null;
  };

  const classified: Classified[] = [];
  for (const studios of perStudent.values()) {
    let total_courses = 0;
    for (const n of studios.values()) total_courses += n;
    const distinct_studios = studios.size;
    const is_loyal = distinct_studios >= 2;
    const exclusive_studio =
      distinct_studios === 1 ? Array.from(studios.keys())[0] : null;
    classified.push({
      total_courses,
      distinct_studios,
      is_loyal,
      exclusive_studio,
    });
  }

  // ----- Total retention: ALL students in period -----
  const allCounts = classified.map((c) => c.total_courses);
  const totalRetention = computeBuckets(allCounts);

  // ----- Per-studio retention: exclusive students grouped by their studio -----
  const studioGroups = new Map<string, number[]>();
  for (const c of classified) {
    if (c.exclusive_studio) {
      const list = studioGroups.get(c.exclusive_studio) ?? [];
      list.push(c.total_courses);
      studioGroups.set(c.exclusive_studio, list);
    }
  }

  const perStudio: StudioRetention[] = Array.from(allStudiosInPeriod)
    .sort((a, b) => a.localeCompare(b))
    .map((studio_name) => {
      const counts = studioGroups.get(studio_name) ?? [];
      return {
        studio_name,
        ...computeBuckets(counts),
      };
    });

  // ----- Loyal retention -----
  const loyalStudents = classified.filter((c) => c.is_loyal);
  const loyalCounts = loyalStudents.map((c) => c.total_courses);
  const loyalRetention = computeBuckets(loyalCounts);

  // Studio distribution for loyal students
  const loyalStudioBuckets: LoyalStudioBuckets = {
    two: loyalStudents.filter((c) => c.distinct_studios === 2).length,
    three_to_four: loyalStudents.filter(
      (c) => c.distinct_studios >= 3 && c.distinct_studios <= 4,
    ).length,
    five_plus: loyalStudents.filter((c) => c.distinct_studios >= 5).length,
  };

  return {
    totalRetention,
    perStudio,
    loyalRetention,
    loyalStudioBuckets,
    exclusive_students: totalRetention.total - loyalRetention.total,
  };
}

// ----- helpers -----

function computeBuckets(counts: number[]): RetentionBuckets {
  return {
    total: counts.length,
    bucket_2_plus: counts.filter((n) => n >= 2).length,
    bucket_3_plus: counts.filter((n) => n >= 3).length,
    bucket_5_plus: counts.filter((n) => n >= 5).length,
    bucket_10_plus: counts.filter((n) => n >= 10).length,
  };
}

function emptyResult(): LoyaltyData {
  const empty: RetentionBuckets = {
    total: 0,
    bucket_2_plus: 0,
    bucket_3_plus: 0,
    bucket_5_plus: 0,
    bucket_10_plus: 0,
  };
  return {
    totalRetention: empty,
    perStudio: [],
    loyalRetention: empty,
    loyalStudioBuckets: { two: 0, three_to_four: 0, five_plus: 0 },
    exclusive_students: 0,
  };
}
