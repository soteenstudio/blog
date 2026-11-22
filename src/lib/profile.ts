import { db } from "./db";
import type { ParsedAvatar } from "./avatar";

export interface PublicProfile {
  id: string;
  name: string;
  profession: string | null;
  avatarVersion: string | null;
  createdAt: string;
  followerCount: number;
}

export interface FollowerSummary {
  id: string;
  name: string;
  profession: string | null;
  avatarVersion: string | null;
  followedAt: string;
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const result = await db.execute({
    sql: `SELECT u.id, u.name, u.profession, u.avatar_version, u.created_at,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS follower_count
          FROM users u WHERE u.id = ?`,
    args: [id],
  });
  const r = result.rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    name: String(r.name),
    profession: r.profession ? String(r.profession) : null,
    avatarVersion: r.avatar_version ? String(r.avatar_version) : null,
    createdAt: String(r.created_at),
    followerCount: Number(r.follower_count ?? 0),
  };
}

export async function updateProfession(userId: string, profession: string | null) {
  await db.execute({ sql: "UPDATE users SET profession = ? WHERE id = ?", args: [profession, userId] });
}

export async function setAvatar(userId: string, avatar: ParsedAvatar) {
  await db.execute({
    sql: "UPDATE users SET avatar_data = ?, avatar_mime = ?, avatar_version = ? WHERE id = ?",
    args: [avatar.base64, avatar.mime, String(Date.now()), userId],
  });
}

export async function clearAvatar(userId: string) {
  await db.execute({
    sql: "UPDATE users SET avatar_data = NULL, avatar_mime = NULL, avatar_version = NULL WHERE id = ?",
    args: [userId],
  });
}

export async function getAvatar(userId: string): Promise<{ mime: string; data: Buffer } | null> {
  const result = await db.execute({
    sql: "SELECT avatar_data, avatar_mime FROM users WHERE id = ? AND avatar_data IS NOT NULL",
    args: [userId],
  });
  const r = result.rows[0];
  if (!r) return null;
  return { mime: String(r.avatar_mime), data: Buffer.from(String(r.avatar_data), "base64") };
}

export async function listFollowers(userId: string, limit = 100): Promise<FollowerSummary[]> {
  const result = await db.execute({
    sql: `SELECT u.id, u.name, u.profession, u.avatar_version, f.created_at
          FROM follows f JOIN users u ON u.id = f.follower_id
          WHERE f.following_id = ?
          ORDER BY f.created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    profession: r.profession ? String(r.profession) : null,
    avatarVersion: r.avatar_version ? String(r.avatar_version) : null,
    followedAt: String(r.created_at),
  }));
}
