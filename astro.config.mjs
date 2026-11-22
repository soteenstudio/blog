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
      TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret" }),
      TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      // Email admin, dipisah koma: "kamu@contoh.com,rekan@contoh.com"
      ADMIN_EMAILS: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});