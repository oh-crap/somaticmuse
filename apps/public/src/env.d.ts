/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
