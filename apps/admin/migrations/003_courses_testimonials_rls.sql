-- =============================================================
-- RLS for courses and testimonials tables
-- =============================================================
-- Backport migration: these policies were originally applied
-- directly via Supabase dashboard. This file documents the
-- production state in version control so the schema is
-- reproducible from a fresh database.
--
-- Idempotent: safe to run on a database where these objects
-- already exist.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. courses
-- -------------------------------------------------------------
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Public website needs to render all courses. No INSERT/UPDATE/DELETE
-- policy is defined, so writes are denied for anon by default.
-- Admin app uses service_role which bypasses RLS.
DROP POLICY IF EXISTS "Anyone can read courses" ON courses;
CREATE POLICY "Anyone can read courses"
  ON courses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------
-- 2. testimonials
-- -------------------------------------------------------------
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public website only sees testimonials marked visible.
-- Drafts (visible = false) stay hidden from anon.
DROP POLICY IF EXISTS "anon can read visible testimonials" ON testimonials;
CREATE POLICY "anon can read visible testimonials"
  ON testimonials
  FOR SELECT
  TO anon
  USING (visible = true);

COMMIT;