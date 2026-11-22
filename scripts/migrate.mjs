import { createClient } from "@libsql/client";

const url = process.env.ST_BLOG_DB_TURSO_DATABASE_URL;
if (!url) {
  console.error("ST_BLOG_DB_TURSO_DATABASE_URL belum diatur. Salin .env.example menjadi .env terlebih dulu.");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.ST_BLOG_DB_TURSO_AUTH_TOKEN || undefined });
const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    can_post INTEGER NOT NULL DEFAULT 0,
    profession TEXT,
    avatar_data TEXT,
    avatar_mime TEXT,
    avatar_version TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'id',
    alt_title TEXT,
    alt_excerpt TEXT,
    alt_content TEXT,
    category TEXT NOT NULL DEFAULT 'Umum',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Tim SoTeen Studio',
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS likes (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (post_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (follower_id, following_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at DESC)`,
];

await db.batch(statements, "write");

// Database yang dibuat versi lama belum punya kolom-kolom baru: tambahkan tanpa menghapus data.
async function ensureColumn(table, column, ddl) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  if (!info.rows.some((row) => row.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    console.log(`Kolom ${table}.${column} ditambahkan.`);
  }
}

await ensureColumn("users", "can_post", "INTEGER NOT NULL DEFAULT 0");
await ensureColumn("users", "profession", "TEXT");
await ensureColumn("users", "avatar_data", "TEXT");
await ensureColumn("users", "avatar_mime", "TEXT");
await ensureColumn("users", "avatar_version", "TEXT");
await ensureColumn("posts", "lang", "TEXT NOT NULL DEFAULT 'id'");
await ensureColumn("posts", "alt_title", "TEXT");
await ensureColumn("posts", "alt_excerpt", "TEXT");
await ensureColumn("posts", "alt_content", "TEXT");

console.log(`Migrasi selesai di ${url}`);
