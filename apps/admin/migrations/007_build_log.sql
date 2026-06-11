-- apps/admin/migrations/007_build_log.sql
-- =============================================================
-- build_log: history of republish decisions
-- =============================================================
-- One row per republish attempt (manual via admin UI, automatic
-- via republish-cron Worker, or implicit via DELETE trigger).
-- Used by the cron to find the last successful build timestamp,
-- so the change-detection window survives missed/failed runs.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS build_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at          timestamptz NOT NULL DEFAULT now(),
  triggered_build boolean     NOT NULL,
  reason          text        NOT NULL,
  source          text        NOT NULL CHECK (source IN ('manual', 'cron', 'trigger')),
  details         jsonb
);

COMMENT ON TABLE  build_log IS 'History of republish decisions. One row per attempt, whether or not a build was triggered.';
COMMENT ON COLUMN build_log.triggered_build IS 'true if the Cloudflare Pages deploy hook was successfully POSTed.';
COMMENT ON COLUMN build_log.source IS 'manual = admin UI button; cron = scheduled Worker; trigger = DB trigger on DELETE.';
COMMENT ON COLUMN build_log.details IS 'JSON metadata: change counts, last_build_at, error info.';

-- Cron lookup: latest successful build.
CREATE INDEX IF NOT EXISTS idx_build_log_triggered_ran_at
  ON build_log (ran_at DESC)
  WHERE triggered_build = true;

-- Cron lookup: pending trigger-sourced entries since last build.
CREATE INDEX IF NOT EXISTS idx_build_log_source_ran_at
  ON build_log (source, ran_at DESC);

ALTER TABLE build_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all for anon" ON build_log;
CREATE POLICY "Deny all for anon" ON build_log FOR ALL USING (false);

-- -------------------------------------------------------------
-- DELETE triggers — catch deletions that updated_at can't detect
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_publishable_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO build_log (triggered_build, reason, source, details)
  VALUES (
    false,
    'row deleted from ' || TG_TABLE_NAME,
    'trigger',
    jsonb_build_object('deleted_id', OLD.id, 'table', TG_TABLE_NAME)
  );
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION log_publishable_delete IS 'Inserts a pending build_log row when a public-visible row is deleted. The cron picks this up on its next run.';

DROP TRIGGER IF EXISTS courses_log_delete ON courses;
CREATE TRIGGER courses_log_delete
  AFTER DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION log_publishable_delete();

DROP TRIGGER IF EXISTS testimonials_log_delete ON testimonials;
CREATE TRIGGER testimonials_log_delete
  AFTER DELETE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION log_publishable_delete();

COMMIT;