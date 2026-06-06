/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly CLOUDFLARE_DEPLOY_HOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
