// apps/admin/src/pages/api/republish.ts
// POST endpoint that triggers Cloudflare Pages deploy hook (manual republish).
// Called from the Republish button in AdminLayout header.

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirect_to") ?? "/");

  // Astro v6 + Cloudflare adapter: read runtime env via cloudflare:workers module
  const deployHookUrl = (env as Record<string, string | undefined>).CLOUDFLARE_DEPLOY_HOOK_URL;

  if (!deployHookUrl) {
    console.error("[Admin] CLOUDFLARE_DEPLOY_HOOK_URL not configured");
    return redirect(
      `${redirectTo}?error=${encodeURIComponent("Deploy hook URL not configured in Worker secrets")}`,
      302
    );
  }

  try {
    const response = await fetch(deployHookUrl, { method: "POST" });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Admin] Deploy hook failed: ${response.status} ${text}`);
      return redirect(
        `${redirectTo}?error=${encodeURIComponent(`Deploy hook returned ${response.status}`)}`,
        302
      );
    }

    return redirect(`${redirectTo}?status=republished`, 302);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Admin] Deploy hook request error:", errorMsg);
    return redirect(
      `${redirectTo}?error=${encodeURIComponent(`Deploy hook request failed: ${errorMsg}`)}`,
      302
    );
  }
};