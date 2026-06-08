/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly CLOUDFLARE_DEPLOY_HOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


declare namespace App {
  interface Locals {
    // Email of the authenticated user, set by middleware after JWT verification
    userEmail: string;
  }
}

/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    // Email of the authenticated user, set by middleware after JWT verification
    userEmail: string;
  }
}