// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://somaticmusehealing.com",
  server: {
    host: true,
  },
  i18n: {
    defaultLocale: "ro",
    locales: ["ro", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "ro",
        locales: {
          ro: "ro-RO",
          en: "en-US",
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
