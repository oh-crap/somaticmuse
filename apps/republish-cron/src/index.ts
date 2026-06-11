// apps/republish-cron/src/index.ts
//
// Scheduled Cloudflare Worker that conditionally triggers the
// public website's Cloudflare Pages deploy hook.
//
// Runs daily at 23:00 UTC (= 01:00 Bucharest winter, 02:00 summer).
//
// A build is triggered only if at least one of the following is
// true since the last successful build:
//   1. A row in `courses` was updated.
//   2. A row in `testimonials` was updated.
//   3. A course's `end_at` fell into the window (=> it should
//      disappear from the public schedule).
//   4. A pending `source='trigger'` row exists in build_log
//      (=> a row was deleted from courses/testimonials).
//
// Every decision is recorded in `build_log` for observability,
// including no-op runs.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLOUDFLARE_DEPLOY_HOOK_URL: string;
}

interface DecisionDetails {
  last_build_at: string | null;
  courses_changed: number;
  testimonials_changed: number;
  courses_ended: number;
  pending_deletes: number;
}

// Fallback lookback if build_log is empty (first run after deploy).
const FALLBACK_LOOKBACK_HOURS = 25;

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // waitUntil so the platform doesn't terminate before logging finishes.
    ctx.waitUntil(runRepublishCheck(env));
  },

  // Manual invocation — useful for `wrangler dev --test-scheduled` and
  // for ad-hoc verification. No auth: the deploy hook URL is the actual
  // secret, and this handler only kicks off the same check the cron does.
  async fetch(
    _req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    ctx.waitUntil(runRepublishCheck(env));
    return new Response(
      "Republish check triggered. See build_log for outcome.\n",
      { headers: { "Content-Type": "text/plain" } },
    );
  },
};

async function runRepublishCheck(env: Env): Promise<void> {
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  const lastBuildAt = await findLastBuildAt(supabase, now);
  const lastBuildIso = lastBuildAt.toISOString();
  const nowIso = now.toISOString();

  // Run all four checks in parallel — they're independent count queries.
  const [coursesChanged, testimonialsChanged, coursesEnded, pendingDeletes] =
    await Promise.all([
      countSince(supabase, "courses", "updated_at", lastBuildIso),
      countSince(supabase, "testimonials", "updated_at", lastBuildIso),
      countCoursesEnded(supabase, lastBuildIso, nowIso),
      countPendingDeletes(supabase, lastBuildIso),
    ]);

  const details: DecisionDetails = {
    last_build_at: lastBuildIso,
    courses_changed: coursesChanged,
    testimonials_changed: testimonialsChanged,
    courses_ended: coursesEnded,
    pending_deletes: pendingDeletes,
  };

  const shouldBuild =
    coursesChanged > 0 ||
    testimonialsChanged > 0 ||
    coursesEnded > 0 ||
    pendingDeletes > 0;

  if (!shouldBuild) {
    await logDecision(supabase, false, "no changes detected", details);
    console.log("[republish-cron] No changes; skipped.", details);
    return;
  }

  const reason = buildReason(details);

  // Trigger Cloudflare Pages deploy hook.
  try {
    const res = await fetch(env.CLOUDFLARE_DEPLOY_HOOK_URL, { method: "POST" });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      const msg = `deploy hook returned ${res.status}: ${body}`;
      // Log as failed attempt — next run will retry because last successful
      // triggered_build=true entry is still further in the past.
      await logDecision(supabase, false, msg, details);
      console.error("[republish-cron]", msg);
      return;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logDecision(
      supabase,
      false,
      `deploy hook fetch failed: ${msg}`,
      details,
    );
    console.error("[republish-cron] Deploy hook fetch failed:", msg);
    return;
  }

  await logDecision(supabase, true, reason, details);
  console.log("[republish-cron] Republish triggered:", reason, details);
}

// ---- Helpers ---------------------------------------------------------

async function findLastBuildAt(
  supabase: SupabaseClient,
  now: Date,
): Promise<Date> {
  const { data, error } = await supabase
    .from("build_log")
    .select("ran_at")
    .eq("triggered_build", true)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[republish-cron] Failed to read build_log, using fallback:",
      error.message,
    );
  }

  if (data?.ran_at) return new Date(data.ran_at);

  // First run, or read failed — be conservative and look back 25h so any
  // recent change still gets picked up.
  return new Date(now.getTime() - FALLBACK_LOOKBACK_HOURS * 60 * 60 * 1000);
}

async function countSince(
  supabase: SupabaseClient,
  table: string,
  column: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .gt(column, sinceIso);
  if (error) {
    console.error(
      `[republish-cron] Count failed on ${table}.${column}:`,
      error.message,
    );
    return 0;
  }
  return count ?? 0;
}

async function countCoursesEnded(
  supabase: SupabaseClient,
  sinceIso: string,
  nowIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .gt("end_at", sinceIso)
    .lte("end_at", nowIso);
  if (error) {
    console.error("[republish-cron] courses_ended count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countPendingDeletes(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("build_log")
    .select("*", { count: "exact", head: true })
    .eq("source", "trigger")
    .gt("ran_at", sinceIso);
  if (error) {
    console.error(
      "[republish-cron] pending_deletes count failed:",
      error.message,
    );
    return 0;
  }
  return count ?? 0;
}

async function logDecision(
  supabase: SupabaseClient,
  triggered: boolean,
  reason: string,
  details: DecisionDetails,
): Promise<void> {
  const { error } = await supabase.from("build_log").insert({
    triggered_build: triggered,
    reason,
    source: "cron",
    details,
  });
  if (error) {
    console.error("[republish-cron] Failed to write build_log:", error.message);
  }
}

function buildReason(d: DecisionDetails): string {
  const parts: string[] = [];
  if (d.courses_changed > 0) {
    parts.push(`${d.courses_changed} course(s) changed`);
  }
  if (d.testimonials_changed > 0) {
    parts.push(`${d.testimonials_changed} testimonial(s) changed`);
  }
  if (d.courses_ended > 0) {
    parts.push(`${d.courses_ended} course(s) ended`);
  }
  if (d.pending_deletes > 0) {
    parts.push(`${d.pending_deletes} pending delete(s)`);
  }
  return parts.join("; ");
}