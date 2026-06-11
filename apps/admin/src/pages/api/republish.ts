// apps/admin/src/pages/api/republish.ts
// POST endpoint that triggers Cloudflare Pages deploy hook (manual republish).
// Called from the Republish button in AdminLayout header.
// Logs to build_log so the republish-cron Worker knows the last build time.

import type { APIRoute } from "astro";
import { safeRedirect } from "../../lib/redirect";
import { supabaseAdmin } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const redirectTo = safeRedirect(formData.get("redirect_to")?.toString(), "/");

  const deployHookUrl = import.meta.env.CLOUDFLARE_DEPLOY_HOOK_URL;

  if (!deployHookUrl) {
    console.error("[Admin] CLOUDFLARE_DEPLOY_HOOK_URL not configured");
    return redirect(
      `${redirectTo}?error=${encodeURIComponent("Deploy hook URL not configured in Worker build vars")}`,
      302,
    );
  }

  try {
    const response = await fetch(deployHookUrl, { method: "POST" });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Admin] Deploy hook failed: ${response.status} ${text}`);
      return redirect(
        `${redirectTo}?error=${encodeURIComponent(`Deploy hook returned ${response.status}`)}`,
        302,
      );
    }

    // Record the successful manual build so the cron Worker knows the
    // change-detection window. Logging failure does NOT fail the user
    // request — the build itself already succeeded.
    try {
      await supabaseAdmin.from("build_log").insert({
        triggered_build: true,
        reason: "manual republish from admin UI",
        source: "manual",
        details: null,
      });
    } catch (logErr) {
      console.error("[Admin] build_log insert failed:", logErr);
    }

    return redirect(`${redirectTo}?status=republished`, 302);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Admin] Deploy hook request error:", errorMsg);
    return redirect(
      `${redirectTo}?error=${encodeURIComponent(`Deploy hook request failed: ${errorMsg}`)}`,
      302,
    );
  }
};
