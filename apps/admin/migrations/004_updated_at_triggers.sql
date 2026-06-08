-- =============================================================
-- Auto-update updated_at columns via trigger
-- =============================================================
-- The students and courses tables had `updated_at timestamptz
-- DEFAULT now()`, but DEFAULT only applies on INSERT. Without a
-- trigger, the column never updated, silently lying to clients
-- that read it.
--
-- Idempotent: safe to run repeatedly.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS students_set_updated_at ON students;
CREATE TRIGGER students_set_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS courses_set_updated_at ON courses;
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;