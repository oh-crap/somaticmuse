/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // Supabase — service role key, server-side only, never PUBLIC_ prefixed
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;

  // Cloudflare Access — JWT validation in middleware.ts
  readonly CF_ACCESS_TEAM_DOMAIN: string;
  readonly CF_ACCESS_AUD: string;

  // Cloudflare Pages deploy hook — POST'd by /api/republish
  readonly CLOUDFLARE_DEPLOY_HOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
