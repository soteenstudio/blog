// Memindahkan semua artikel dari satu kategori ke kategori lain.
// Pakai setelah menghapus kategori dari src/data/categories.mjs:
//   pnpm db:move-category <id-lama> <id-baru>
import { createClient } from "@libsql/client";
import { categories, resolveCategoryId } from "../src/data/categories.mjs";

const [from, to] = process.argv.slice(2).map((v) => v?.trim());
if (!from || !to) {
  console.error("Pemakaian: pnpm db:move-category <id-lama> <id-baru>");
  console.error(`Kategori yang ada: ${categories.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const target = resolveCategoryId(to);
if (!target) {
  console.error(`"${to}" bukan kategori yang ada di src/data/categories.mjs (${categories.map((c) => c.id).join(", ")}).`);
  process.exit(1);
}

const db = createClient({
  url: process.env.ST_BLOG_DB_TURSO_DATABASE_URL,
  authToken: process.env.ST_BLOG_DB_TURSO_AUTH_TOKEN || undefined,
});
const res = await db.execute({ sql: "UPDATE posts SET category = ? WHERE category = ?", args: [target, from] });
console.log(`${res.rowsAffected} artikel dipindah dari "${from}" ke "${target}".`);
