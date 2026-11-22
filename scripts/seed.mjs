import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { seedPosts } from "./seed-posts.mjs";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

let inserted = 0;
let offset = 0;
for (const post of seedPosts) {
  const publishedAt = new Date(Date.now() - offset * 3 * 24 * 60 * 60 * 1000).toISOString();
  offset += 1;
  const result = await db.execute({
    sql: `INSERT OR IGNORE INTO posts (id, slug, title, excerpt, content, category, status, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
    args: [randomUUID(), post.slug, post.title, post.excerpt, post.content, post.category, publishedAt, publishedAt, publishedAt],
  });
  inserted += result.rowsAffected;
}
console.log(`Seed selesai: ${inserted} artikel baru ditambahkan (yang slug-nya sudah ada dilewati).`);
