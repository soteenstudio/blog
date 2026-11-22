// Memeriksa database mana yang sebenarnya dipakai dan tabel apa saja yang ada di dalamnya.
// Pemakaian:  node --env-file=.env scripts/check-db.mjs
// Token tidak pernah dicetak.
import { createClient } from "@libsql/client";

const url = process.env.ST_BLOG_DB_TURSO_DATABASE_URL;
if (!url) {
  console.error("ST_BLOG_DB_TURSO_DATABASE_URL tidak terbaca dari env.");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.ST_BLOG_DB_TURSO_AUTH_TOKEN || undefined });

const where = url.startsWith("file:") ? `${url} (FILE LOKAL, bukan Turso)` : new URL(url.replace("libsql://", "https://")).host;
console.log("Database :", where);

const result = await db.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
const tables = result.rows.map((r) => String(r.name));
console.log("Tabel    :", tables.length ? tables.join(", ") : "(kosong, migrasi belum dijalankan di database ini)");

for (const table of ["users", "posts", "comments", "likes", "follows"]) {
  if (tables.includes(table)) {
    const n = (await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n;
    console.log(`  ${table.padEnd(9)}: ${n} baris`);
  }
}