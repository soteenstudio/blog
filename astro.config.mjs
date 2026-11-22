import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";

// Blog ini berjalan sebagai SSR (login, like, dan komentar butuh server).
export default defineConfig({
  output: "server",
  adapter: vercel(),
  site: process.env.SITE_URL ?? "http://localhost:4321",
  security: { checkOrigin: true },
  env: {
    schema: {
      ST_BLOG_DB_TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret" }),
      ST_BLOG_DB_TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      ADMIN_EMAILS: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});