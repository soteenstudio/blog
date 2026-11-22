import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

// Blog ini berjalan sebagai SSR (login, like, dan komentar butuh server).
// Untuk hosting lain (Vercel, Netlify, Cloudflare) cukup ganti adapter di bawah.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
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
