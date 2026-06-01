import { createSupabaseClient } from "@somaticmuse/shared";

export const supabase = createSupabaseClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

export type { Course, CourseFormat, CourseInsert, CourseUpdate } from "@somaticmuse/shared";