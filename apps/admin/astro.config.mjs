// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://admin.somaticmusehealing.com",
  output: "server",
  adapter: cloudflare(),
  server: {
    host: true,
    port: 4322,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
