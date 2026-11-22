import { createClient } from "@libsql/client";
import { ST_BLOG_DB_TURSO_AUTH_TOKEN, ST_BLOG_DB_TURSO_DATABASE_URL } from "astro:env/server";

/** Satu klien libSQL untuk seluruh aplikasi (Turso di produksi, file SQLite di lokal). */
export const db = createClient({
  url: ST_BLOG_DB_TURSO_DATABASE_URL,
  authToken: ST_BLOG_DB_TURSO_AUTH_TOKEN || undefined,
});
