import { db } from "./db";

export async function countFollowers(userId: string): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM follows WHERE following_id = ?",
    args: [userId],
  });
  return Number(result.rows[0]?.n ?? 0);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
    args: [followerId, followingId],
  });
  return result.rows.length > 0;
}

export async function userExists(id: string): Promise<boolean> {
  const result = await db.execute({ sql: "SELECT 1 FROM users WHERE id = ?", args: [id] });
  return result.rows.length > 0;
}

/** Ikuti/berhenti mengikuti. Kunci utama (follower_id, following_id) mencegah ikut ganda. */
export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<{ following: boolean; followers: number }> {
  const deleted = await db.execute({
    sql: "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
    args: [followerId, followingId],
  });

  let following = false;
  if (deleted.rowsAffected === 0) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)",
      args: [followerId, followingId, new Date().toISOString()],
    });
    following = true;
  }
  return { following, followers: await countFollowers(followingId) };
}
