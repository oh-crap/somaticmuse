import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No session needed for build-time fetch
  },
});

// ---------------------------------------------------------------------
// Types — must match Supabase schema
// ---------------------------------------------------------------------
export type CourseFormat = "individual" | "group";

export interface Course {
  id: string;
  title: string;
  yoga_style: string;
  format: CourseFormat;
  start_at: string;
  end_at: string;
  studio_name: string;
  studio_address: string;
  booking_url: string | null;
  created_at: string;
  updated_at: string;
}
