import { createSupabaseClient } from "@somaticmuse/shared";

/**
 * Public-site Supabase client (anon key, read-only via RLS).
 *
 * KNOWN LIMITATION — static build only:
 * apps/public has no Astro SSR adapter (no @astrojs/cloudflare or similar)
 * and defaults to output: "static". Every page is prerendered at build
 * time. If any page later sets `export const prerender = false` or uses
 * server-side runtime features, the build will fail with an adapter
 * error.
 *
 * To allow SSR pages: add an adapter to apps/public/astro.config.mjs,
 * mirror the admin app's pattern. SUPABASE_URL and SUPABASE_ANON_KEY
 * then move from build-time literal to Worker env.
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
  Testimonial,
  TestimonialInsert,
  TestimonialUpdate,
} from "@somaticmuse/shared";
