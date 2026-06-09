// apps/admin/src/lib/dashboard/charts.ts
// Tile 5: Charts — monthly aggregations.
// To be implemented in Milestone 3.

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