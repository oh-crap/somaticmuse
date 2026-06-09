// apps/admin/src/lib/dashboard/lessons.ts
// Tile 3: No-lesson / single-lesson students.
// To be implemented in Milestone 4.

export type LessonsFilterType = "none" | "single";
export type LessonsSortType = "recent" | "alpha";

export interface LessonsStudentRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  created_at: string;
  last_lesson_at: string | null; // only for "single" type
}