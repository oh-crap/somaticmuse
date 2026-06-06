// apps/admin/src/pages/api/republish.ts
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirect_to") ?? "/");

  const envObj = env as Record<string, unknown>;

  // DEBUG: log what's actually in env
  console.log(
    "[Republish DEBUG] env keys:",
    JSON.stringify(Object.keys(envObj)),
  );
  console.log(
    "[Republish DEBUG] CLOUDFLARE_DEPLOY_HOOK_URL present:",
    "CLOUDFLARE_DEPLOY_HOOK_URL" in envObj,
  );
  console.log(
    "[Republish DEBUG] CLOUDFLARE_DEPLOY_HOOK_URL type:",
    typeof envObj.CLOUDFLARE_DEPLOY_HOOK_URL,
  );
  console.log(
    "[Republish DEBUG] SUPABASE_URL present:",
    "SUPABASE_URL" in envObj,
  );

  const deployHookUrl = envObj.CLOUDFLARE_DEPLOY_HOOK_URL as string | undefined;

  if (!deployHookUrl) {
    console.error("[Admin] CLOUDFLARE_DEPLOY_HOOK_URL not configured");
    return redirect(
      `${redirectTo}?error=${encodeURIComponent("Deploy hook URL not configured in Worker secrets")}`,
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
