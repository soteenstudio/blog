import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import type { SessionUser } from "./auth";
import { db } from "./db";
import { slugify } from "./format";
import type { Locale } from "@/data/copy/index";

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  /** Bahasa teks utama (title/excerpt/content). Terjemahan opsional ada di alt*. */
  lang: Locale;
  altTitle: string | null;
  altExcerpt: string | null;
  altContent: string | null;
  authorAvatarVersion: string | null;
  authorProfession: string | null;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  status: PostStatus;
  authorId: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  readingMinutes: number;
}

export interface PostInput {
  lang: Locale;
  altTitle: string;
  altExcerpt: string;
  altContent: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  status: PostStatus;
}

const SELECT_POST = `
  SELECT p.*,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
    (SELECT u.avatar_version FROM users u WHERE u.id = p.author_id) AS author_avatar,
    (SELECT u.profession FROM users u WHERE u.id = p.author_id) AS author_profession
  FROM posts p`;

function toPost(row: Row): Post {
  const content = String(row.content);
  const words = content.split(/\s+/).filter(Boolean).length;
  return {
    id: String(row.id),
    lang: row.lang === "en" ? "en" : "id",
    altTitle: row.alt_title ? String(row.alt_title) : null,
    altExcerpt: row.alt_excerpt ? String(row.alt_excerpt) : null,
    altContent: row.alt_content ? String(row.alt_content) : null,
    authorAvatarVersion: row.author_avatar ? String(row.author_avatar) : null,
    authorProfession: row.author_profession ? String(row.author_profession) : null,
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt),
    content,
    category: String(row.category),
    status: row.status === "published" ? "published" : "draft",
    authorId: row.author_id ? String(row.author_id) : null,
    authorName: String(row.author_name),
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
}

export async function listPublished(options: { category?: string | null; page?: number; perPage: number }) {
  const { category, perPage } = options;
  const page = Math.max(1, options.page ?? 1);
  const where = category ? "WHERE p.status = 'published' AND p.category = ?" : "WHERE p.status = 'published'";
  const args = category ? [category] : [];

  const totalResult = await db.execute({ sql: `SELECT COUNT(*) AS n FROM posts p ${where}`, args });
  const total = Number(totalResult.rows[0]?.n ?? 0);

  const rows = await db.execute({
    sql: `${SELECT_POST} ${where} ORDER BY p.published_at DESC LIMIT ? OFFSET ?`,
    args: [...args, perPage, (page - 1) * perPage],
  });

  return {
    posts: rows.rows.map(toPost),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function listCategories(): Promise<{ name: string; count: number }[]> {
  const result = await db.execute(
    "SELECT category AS name, COUNT(*) AS n FROM posts WHERE status = 'published' GROUP BY category ORDER BY n DESC, category",
  );
  return result.rows.map((r) => ({ name: String(r.name), count: Number(r.n) }));
}

/** Admin melihat semua artikel; penulis hanya melihat artikelnya sendiri. */
export async function listForDashboard(user: SessionUser): Promise<Post[]> {
  const result =
    user.role === "admin"
      ? await db.execute(`${SELECT_POST} ORDER BY p.updated_at DESC`)
      : await db.execute({ sql: `${SELECT_POST} WHERE p.author_id = ? ORDER BY p.updated_at DESC`, args: [user.id] });
  return result.rows.map(toPost);
}

/** Admin boleh mengelola semua artikel; penulis hanya artikel miliknya (dan harus masih punya izin menulis). */
export function canManagePost(user: SessionUser, post: Post): boolean {
  if (user.role === "admin") return true;
  return user.canPost && post.authorId === user.id;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const result = await db.execute({ sql: `${SELECT_POST} WHERE p.slug = ?`, args: [slug] });
  return result.rows[0] ? toPost(result.rows[0]) : null;
}

export async function getPostById(id: string): Promise<Post | null> {
  const result = await db.execute({ sql: `${SELECT_POST} WHERE p.id = ?`, args: [id] });
  return result.rows[0] ? toPost(result.rows[0]) : null;
}

export async function publishedPostExists(id: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM posts WHERE id = ? AND status = 'published'",
    args: [id],
  });
  return result.rows.length > 0;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "artikel";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const result = await db.execute({
      sql: "SELECT id FROM posts WHERE slug = ?",
      args: [candidate],
    });
    const existing = result.rows[0];
    if (!existing || String(existing.id) === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

export async function createPost(input: PostInput, author: { id: string; name: string }): Promise<Post> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug(slugify(input.slug || input.title));

  await db.execute({
    sql: `INSERT INTO posts (id, slug, title, excerpt, content, lang, alt_title, alt_excerpt, alt_content, category, status, author_id, author_name, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      slug,
      input.title,
      input.excerpt,
      input.content,
      input.lang,
      input.altTitle || null,
      input.altExcerpt || null,
      input.altContent || null,
      input.category,
      input.status,
      author.id,
      author.name,
      input.status === "published" ? now : null,
      now,
      now,
    ],
  });

  return (await getPostById(id))!;
}

export async function updatePost(id: string, input: PostInput): Promise<Post | null> {
  const current = await getPostById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const slug = await uniqueSlug(slugify(input.slug || input.title), id);
  const publishedAt = input.status === "published" ? (current.publishedAt ?? now) : null;

  await db.execute({
    sql: `UPDATE posts SET slug = ?, title = ?, excerpt = ?, content = ?, lang = ?, alt_title = ?, alt_excerpt = ?,
          alt_content = ?, category = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    args: [
      slug,
      input.title,
      input.excerpt,
      input.content,
      input.lang,
      input.altTitle || null,
      input.altExcerpt || null,
      input.altContent || null,
      input.category,
      input.status,
      publishedAt,
      now,
      id,
    ],
  });

  return getPostById(id);
}

export async function deletePost(id: string): Promise<void> {
  await db.batch(
    [
      { sql: "DELETE FROM likes WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM comments WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM posts WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

export interface LocalizedPost {
  title: string;
  excerpt: string;
  content: string;
  readingMinutes: number;
  /** Bahasa teks yang benar-benar ditampilkan. */
  shownLang: Locale;
  /** False bila pembaca meminta bahasa lain tetapi artikel belum punya terjemahannya. */
  inRequestedLang: boolean;
}

const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

/** Memilih teks sesuai bahasa pembaca; bila terjemahan belum ada, tampilkan teks utama. */
export function localize(post: Post, locale: Locale): LocalizedPost {
  const hasAlt = !!(post.altTitle && post.altContent);
  if (locale !== post.lang && hasAlt) {
    const content = post.altContent!;
    return {
      title: post.altTitle!,
      excerpt: post.altExcerpt ?? "",
      content,
      readingMinutes: readingMinutes(content),
      shownLang: locale,
      inRequestedLang: true,
    };
  }
  return {
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    readingMinutes: readingMinutes(post.content),
    shownLang: post.lang,
    inRequestedLang: post.lang === locale,
  };
}

export async function listPublishedByAuthor(authorId: string, limit = 12): Promise<Post[]> {
  const result = await db.execute({
    sql: `${SELECT_POST} WHERE p.status = 'published' AND p.author_id = ? ORDER BY p.published_at DESC LIMIT ?`,
    args: [authorId, limit],
  });
  return result.rows.map(toPost);
}

export async function listAllForAdmin(): Promise<Post[]> {
  const result = await db.execute(`${SELECT_POST} ORDER BY p.updated_at DESC`);
  return result.rows.map(toPost);
}