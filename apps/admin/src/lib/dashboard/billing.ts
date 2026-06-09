// apps/admin/src/lib/dashboard/billing.ts
// Tile 1: Fakturace — data fetch + aggregation.
// To be implemented in Milestone 2.

export interface BillingStudio {
  studio_name: string;
  course_count: number;
  lessons: BillingLesson[];
}

export interface BillingLesson {
  course_id: string;
  title: string;
  start_at: string;
  student_count: number;
}