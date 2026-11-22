import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { SessionUser } from "./auth";

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  userId: string;
  authorAvatarVersion: string | null;
}

export async function listComments(postId: string, limit: number): Promise<Comment[]> {
  const result = await db.execute({
    sql: `SELECT c.id, c.body, c.created_at, c.user_id, u.name AS author_name, u.avatar_version
          FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.post_id = ?
          ORDER BY c.created_at DESC
          LIMIT ?`,
    args: [postId, limit],
  });
  return result.rows.map((r) => ({
    id: String(r.id),
    body: String(r.body),
    createdAt: String(r.created_at),
    authorName: String(r.author_name),
    userId: String(r.user_id),
    authorAvatarVersion: r.avatar_version ? String(r.avatar_version) : null,
  }));
}

export async function addComment(postId: string, user: SessionUser, body: string): Promise<Comment> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO comments (id, post_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, postId, user.id, body, createdAt],
  });
  return { id, body, createdAt, authorName: user.name, userId: user.id, authorAvatarVersion: user.avatarVersion };
}

export type DeleteResult = "deleted" | "not-found" | "forbidden";

export async function deleteComment(id: string, user: SessionUser): Promise<DeleteResult> {
  const result = await db.execute({ sql: "SELECT user_id FROM comments WHERE id = ?", args: [id] });
  const row = result.rows[0];
  if (!row) return "not-found";
  if (String(row.user_id) !== user.id && user.role !== "admin") return "forbidden";
  await db.execute({ sql: "DELETE FROM comments WHERE id = ?", args: [id] });
  return "deleted";
}
