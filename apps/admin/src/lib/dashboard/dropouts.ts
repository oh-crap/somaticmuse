// apps/admin/src/lib/dashboard/dropouts.ts
// Tile 4: Odpadávači — irregular attendance + declining activity.
// To be implemented in Milestone 5.

export type DropoutsType = "irregular" | "declining";

export interface IrregularRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  active_weeks: number;
  inactive_weeks: number;
  activity_coefficient: number;
  last_lesson_at: string | null;
}

export interface DecliningRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  prev_period_count: number;
  curr_period_count: number;
  drop: number;
  last_lesson_at: string | null;
}