import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";

// Blog ini berjalan sebagai SSR (login, like, dan komentar butuh server).
export default defineConfig({
  output: "server",
  adapter: vercel(),
  site: process.env.SITE_URL ?? "http://localhost:4321",
  security: { checkOrigin: false }, // CSRF ditangani middleware (src/lib/same-origin.ts)
  env: {
    schema: {
      ST_BLOG_DB_TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret" }),
      ST_BLOG_DB_TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      ADMIN_EMAILS: envField.string({ context: "server", access: "secret", optional: true }),
      // Cloudflare Turnstile (captcha). Isi keduanya untuk mengaktifkan; kosong = verifikasi dilewati.
      TURNSTILE_SITE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      // Domain email tambahan yang ditolak saat mendaftar, dipisah koma (mis. "foo.com,bar.net").
      BLOCKED_EMAIL_DOMAINS: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});