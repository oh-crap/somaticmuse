-- =============================================================
-- Replace sentinel color "#6B7280" with explicit color_assigned flag
-- =============================================================
-- Previously, the app code inferred "color was never assigned from
-- palette" by checking if tag.color === "#6B7280" (the default).
-- This breaks the moment a user legitimately picks that gray, or
-- the default changes.
--
-- Replace with an explicit boolean flag.
--
-- Backfill assumption: all existing rows are treated as having an
-- intentional color. If you spot tags that were never colored from
-- palette and want them re-assigned, set color_assigned = false
-- manually after this migration.
--
-- Idempotent: safe to re-run.
-- =============================================================

BEGIN;

ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS color_assigned boolean NOT NULL DEFAULT false;

-- Backfill: every existing row gets color_assigned = true, on the
-- assumption that the current color is what the instructor wants.
UPDATE tags SET color_assigned = true WHERE color_assigned = false;

COMMENT ON COLUMN tags.color_assigned IS
  'True once a color has been assigned from the palette (or set manually).
   The enrollment auto-tagging logic uses this flag to know whether to
   call assign_tag_color() on first use.';

COMMIT;