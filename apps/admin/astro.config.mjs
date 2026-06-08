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
    // CSRF protection via Origin header check.
    // Disabled in dev because Codespace reverse proxy mismatches Origin/Host.
    // Enabled in production for defense-in-depth alongside Cloudflare Access.
    checkOrigin: !import.meta.env.DEV,
  },
  server: {
    host: true,
    port: 4322,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
