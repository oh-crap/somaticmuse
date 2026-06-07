-- =============================================================
-- Fix: Supabase security warnings
-- 1. sleeping_students view → SECURITY INVOKER
-- 2. All functions → SET search_path = 'public'
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Recreate view with SECURITY INVOKER
-- -------------------------------------------------------------
DROP VIEW IF EXISTS sleeping_students;

CREATE VIEW sleeping_students
WITH (security_invoker = true)
AS
WITH past_attendance AS (
  SELECT
    cs.student_id,
    COUNT(*)           AS past_course_count,
    MAX(c.start_at)    AS last_attended_at
  FROM course_students cs
  JOIN courses c ON c.id = cs.course_id
  WHERE c.start_at < now()
  GROUP BY cs.student_id
),
next_enrollment AS (
  SELECT DISTINCT ON (cs.student_id)
    cs.student_id,
    c.id         AS next_course_id,
    c.title      AS next_course_title,
    c.start_at   AS next_course_start_at,
    c.studio_name AS next_course_studio
  FROM course_students cs
  JOIN courses c ON c.id = cs.course_id
  WHERE c.start_at > now()
  ORDER BY cs.student_id, c.start_at ASC
)
SELECT
  s.id,
  s.first_name,
  s.last_name,
  s.photo_url,
  pa.past_course_count,
  pa.last_attended_at,
  ne.next_course_id,
  ne.next_course_title,
  ne.next_course_start_at,
  ne.next_course_studio
FROM students s
JOIN past_attendance pa ON pa.student_id = s.id
LEFT JOIN next_enrollment ne ON ne.student_id = s.id
WHERE s.active = true
  AND (s.holiday_until IS NULL OR s.holiday_until < CURRENT_DATE)
  AND pa.past_course_count >= 3
  AND pa.last_attended_at < now() - interval '3 weeks';

COMMENT ON VIEW sleeping_students IS 'Students with >=3 past courses whose last attendance was >3 weeks ago. Excludes inactive and on-holiday students.';

-- -------------------------------------------------------------
-- 2. Fix search_path on trg_set_updated_at
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------
-- 3. Fix search_path on set_updated_at (pre-existing, from courses)
-- -------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''public''
      AS $fn$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $fn$;
    ';
  END IF;
END;
$$;

-- -------------------------------------------------------------
-- 4. Fix search_path on assign_tag_color
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_tag_color(p_tag_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_color text;
BEGIN
  SELECT p.color INTO v_color
  FROM tag_color_palette p
  WHERE p.color NOT IN (SELECT t.color FROM tags t)
  ORDER BY p.idx
  LIMIT 1;

  -- If all 50 used, cycle back to first
  IF v_color IS NULL THEN
    SELECT p.color INTO v_color
    FROM tag_color_palette p
    ORDER BY p.idx
    LIMIT 1;
  END IF;

  UPDATE tags SET color = v_color WHERE id = p_tag_id;
  RETURN v_color;
END;
$$;

COMMIT;