import { db } from "./db";

export async function countLikes(postId: string): Promise<number> {
  const result = await db.execute({ sql: "SELECT COUNT(*) AS n FROM likes WHERE post_id = ?", args: [postId] });
  return Number(result.rows[0]?.n ?? 0);
}

export async function hasLiked(postId: string, userId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?",
    args: [postId, userId],
  });
  return result.rows.length > 0;
}

/** Menyalakan/mematikan suka. Kunci utama (post_id, user_id) mencegah suka ganda walau ada dua klik bersamaan. */
export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const deleted = await db.execute({
    sql: "DELETE FROM likes WHERE post_id = ? AND user_id = ?",
    args: [postId, userId],
  });

  let liked = false;
  if (deleted.rowsAffected === 0) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)",
      args: [postId, userId, new Date().toISOString()],
    });
    liked = true;
  }

  return { liked, count: await countLikes(postId) };
}
