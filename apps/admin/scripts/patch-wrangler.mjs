// Post-build patch for adapter-generated wrangler.json.
// Adapter generates with SESSION KV + IMAGES bindings and no nodejs_compat.
// We need: + nodejs_compat (Supabase needs node:crypto, node:buffer)
//          - SESSION KV (we use Cloudflare Access for auth, no sessions)
//          - IMAGES binding (admin has no <Image> components)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const wranglerPath = resolve("dist/server/wrangler.json");
const config = JSON.parse(readFileSync(wranglerPath, "utf8"));

// 1. Enable nodejs_compat
config.compatibility_flags = ["nodejs_compat"];

// 2. Remove SESSION KV binding
delete config.kv_namespaces;
if (config.previews) {
  delete config.previews.kv_namespaces;
}

// 3. Remove IMAGES binding
delete config.images;
if (config.previews) {
  delete config.previews.images;
}

// 4. Enable observability
config.observability = { enabled: true };

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));

console.log("✓ Patched wrangler.json:");
console.log("  + nodejs_compat flag");
console.log("  - SESSION KV binding");
console.log("  - IMAGES binding");
console.log("  + observability enabled");
