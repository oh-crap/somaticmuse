import { createSupabaseClient } from "@somaticmuse/shared";

/**
 * Admin Supabase client — uses SERVICE_ROLE key.
 * Bypasses RLS. SERVER-SIDE ONLY.
 * Never expose to browser bundle (Astro 6 SSR keeps it server-side automatically).
 */
export const supabaseAdmin = createSupabaseClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
);

export type {
  Course,
  CourseFormat,
  CourseInsert,
  CourseUpdate,
} from "@somaticmuse/shared";
