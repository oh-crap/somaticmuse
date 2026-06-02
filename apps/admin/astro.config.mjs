// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://admin.somaticmusehealing.com",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  security: {
    // CSRF check disabled. Two reasons:
    // 1) Codespace forwards via reverse proxy → Origin header mismatches
    //    host → all POSTs would be blocked in dev.
    // 2) In production, admin is behind Cloudflare Access (Zero Trust auth),
    //    which provides stronger CSRF protection than Astro's Origin check.
    checkOrigin: false,
  },
  server: {
    host: true,
    port: 4322,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});