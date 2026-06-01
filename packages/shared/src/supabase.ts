import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Factory for Supabase clients.
 * Public app passes the anon key; admin app passes the service_role key.
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or key. Check .env in your app's directory.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}
