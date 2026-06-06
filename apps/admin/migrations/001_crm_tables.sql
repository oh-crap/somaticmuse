-- =============================================================
-- Somatic Muse CRM — Supabase migration
-- Tables: students, course_students, tags, student_tags
-- =============================================================
-- Run in Supabase SQL Editor (or via supabase db push).
-- Assumes `courses` table already exists with columns:
--   id (uuid), yoga_style (text), format (text), studio_name (text),
--   start_at (timestamptz), end_at (timestamptz).
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. students
-- -------------------------------------------------------------
CREATE TABLE students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  photo_url   text,
  email       text,
  phone       text,
  facebook_url  text,
  instagram_url text,

  -- Free-text note blocks (detail page)
  notes_health  text,
  notes_family  text,
  notes_hobbies text,
  notes_other   text,

  -- Holiday: student is NOT shown as "sleeping" until this date
  holiday_until date,

  -- Soft-deactivation: inactive students appear only in search (greyed out)
  active      boolean NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  students IS 'CRM student profiles managed by the instructor.';
COMMENT ON COLUMN students.holiday_until IS 'If set and >= today, student is excluded from the sleeping-clients list.';
COMMENT ON COLUMN students.active IS 'Inactive students are hidden everywhere except name search.';

-- Index for alphabetical listing & search
CREATE INDEX idx_students_name ON students (last_name, first_name);
-- Index for sleeping-clients query (active students only)
CREATE INDEX idx_students_active ON students (active) WHERE active = true;

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't already exist (courses table may already use this function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_students'
  ) THEN
    CREATE TRIGGER set_updated_at_students
      BEFORE UPDATE ON students
      FOR EACH ROW
      EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END;
$$;

-- -------------------------------------------------------------
-- 2. course_students  (junction: enrollment / attendance)
-- -------------------------------------------------------------
CREATE TABLE course_students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (course_id, student_id)
);

COMMENT ON TABLE course_students IS 'Manual enrollment of students in courses by the instructor.';

-- Fast lookup: "which students are in this course?"
CREATE INDEX idx_cs_course ON course_students (course_id);
-- Fast lookup: "which courses has this student attended?"
CREATE INDEX idx_cs_student ON course_students (student_id);

-- -------------------------------------------------------------
-- 3. tags  (registry of tag values with assigned colors)
-- -------------------------------------------------------------
-- Tags are auto-generated from course data (yoga_style, studio, format).
-- The instructor can also manually add/remove tags on students.
-- This table stores the canonical list + color mapping.

CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('yoga_style', 'studio', 'format')),
  value       text NOT NULL,
  color       text NOT NULL DEFAULT '#6B7280',  -- fallback gray
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (type, value)
);

COMMENT ON TABLE tags IS 'Registry of auto-generated tag values with color assignments. Colors are authoritative for calendar and tag display.';
COMMENT ON COLUMN tags.type IS 'One of: yoga_style, studio, format.';
COMMENT ON COLUMN tags.color IS 'Hex color for UI display. Studio colors also drive the calendar.';

-- -------------------------------------------------------------
-- 3a. Pre-defined color palette (50 distinct hues)
-- -------------------------------------------------------------
-- Used by application code to auto-assign colors to new tags.
-- Stored here as reference; app picks next unused color.
-- Palette designed for good contrast on white background and
-- between adjacent tags — no two neighbours are perceptually close.

CREATE TABLE tag_color_palette (
  idx    smallint PRIMARY KEY,
  color  text NOT NULL
);

INSERT INTO tag_color_palette (idx, color) VALUES
  -- Warm
  ( 1, '#E63946'),  -- red
  ( 2, '#F4A261'),  -- sandy orange
  ( 3, '#E76F51'),  -- burnt sienna
  ( 4, '#D62828'),  -- crimson
  ( 5, '#F77F00'),  -- orange
  -- Yellow / Lime
  ( 6, '#FCBF49'),  -- marigold
  ( 7, '#BFD200'),  -- lime
  ( 8, '#EAE151'),  -- lemon
  ( 9, '#C5A03F'),  -- mustard
  (10, '#8AC926'),  -- yellow-green
  -- Green
  (11, '#06D6A0'),  -- mint
  (12, '#2D6A4F'),  -- forest
  (13, '#40916C'),  -- sage
  (14, '#52B788'),  -- seafoam
  (15, '#1B9E77'),  -- teal-green
  -- Teal / Cyan
  (16, '#00B4D8'),  -- cyan
  (17, '#0096C7'),  -- cerulean
  (18, '#48CAE4'),  -- sky blue
  (19, '#168AAD'),  -- steel teal
  (20, '#34A0A4'),  -- teal
  -- Blue
  (21, '#3A86FF'),  -- blue
  (22, '#4361EE'),  -- royal blue
  (23, '#4895EF'),  -- cornflower
  (24, '#0077B6'),  -- marine
  (25, '#023E8A'),  -- navy
  -- Indigo / Violet
  (26, '#5E60CE'),  -- indigo
  (27, '#7209B7'),  -- violet
  (28, '#6930C3'),  -- deep purple
  (29, '#7B2CBF'),  -- amethyst
  (30, '#9D4EDD'),  -- lavender purple
  -- Pink / Magenta
  (31, '#FF006E'),  -- hot pink
  (32, '#C9184A'),  -- raspberry
  (33, '#FF5C8A'),  -- salmon pink
  (34, '#E056A0'),  -- fuchsia
  (35, '#FF70A6'),  -- bubblegum
  -- Earth / Neutral accents
  (36, '#8D6E63'),  -- mocha
  (37, '#A68A64'),  -- camel
  (38, '#6D4C41'),  -- chocolate
  (39, '#78909C'),  -- blue-grey
  (40, '#546E7A'),  -- slate
  -- Pastels (higher saturation for readability)
  (41, '#81B29A'),  -- muted sage
  (42, '#F2CC8F'),  -- peach
  (43, '#E9C46A'),  -- gold
  (44, '#B5838D'),  -- dusty rose
  (45, '#FFB4A2'),  -- light coral
  -- Bold accents
  (46, '#118AB2'),  -- ocean
  (47, '#073B4C'),  -- dark teal
  (48, '#EF476F'),  -- watermelon
  (49, '#06B6D4'),  -- vivid cyan
  (50, '#8338EC');  -- electric purple

COMMENT ON TABLE tag_color_palette IS 'Pre-defined 50-color palette for auto-assigning tag colors. App picks the lowest unused idx.';

-- -------------------------------------------------------------
-- 4. student_tags  (student ↔ tag association)
-- -------------------------------------------------------------
CREATE TABLE student_tags (
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tag_id       uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (student_id, tag_id)
);

COMMENT ON TABLE  student_tags IS 'Association between students and tags. Auto-upserted on course enrollment; manually editable.';
COMMENT ON COLUMN student_tags.last_seen_at IS 'start_at of the most recent course matching this tag. Drives tag sort order (newest first).';

-- Fast lookup: all tags for a student (detail page, homepage cards)
CREATE INDEX idx_st_student ON student_tags (student_id);
-- Fast lookup: all students with a specific tag
CREATE INDEX idx_st_tag ON student_tags (tag_id);

-- -------------------------------------------------------------
-- 5. Helper function: auto-assign color to a new tag
-- -------------------------------------------------------------
-- Picks the lowest palette index not yet used by any tag.
-- Called from application code after INSERT into tags if color is default.

CREATE OR REPLACE FUNCTION assign_tag_color(p_tag_id uuid)
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_tag_color IS 'Auto-assigns next available palette color to a tag. Called from app code after tag creation.';

-- -------------------------------------------------------------
-- 6. View: sleeping clients
-- -------------------------------------------------------------
-- Students who:
--   - are active
--   - are NOT on holiday (holiday_until IS NULL OR holiday_until < CURRENT_DATE)
--   - attended >= 3 past courses
--   - last past course was > 3 weeks ago
-- Also returns their next future enrollment (if any).

CREATE OR REPLACE VIEW sleeping_students AS
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
-- 7. RLS policies (admin app uses service_role, so RLS is bypassed,
--    but we define policies for safety if anon key is ever used)
-- -------------------------------------------------------------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_color_palette ENABLE ROW LEVEL SECURITY;

-- Read-only for anon (public site doesn't need CRM data, but just in case)
CREATE POLICY "Deny all for anon" ON students     FOR ALL USING (false);
CREATE POLICY "Deny all for anon" ON course_students FOR ALL USING (false);
CREATE POLICY "Deny all for anon" ON tags          FOR ALL USING (false);
CREATE POLICY "Deny all for anon" ON student_tags  FOR ALL USING (false);
CREATE POLICY "Deny all for anon" ON tag_color_palette FOR ALL USING (false);

-- Service role bypasses RLS automatically — admin app uses service_role key.

COMMIT;