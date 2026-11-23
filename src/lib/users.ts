import { db } from "./db";
import { isManagerJob, roleOf, type Role, type SessionUser } from "./auth";
import { invalidateTag } from "./cache";
import { updateProfession } from "./profile";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  canPost: boolean;
  profession: string | null;
  banned: boolean;
  createdAt: string;
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, "\\$&");

function toRecord(r: Record<string, unknown>): UserRecord {
  const email = String(r.email);
  const role = roleOf(r.role, email);
  return {
    id: String(r.id),
    name: String(r.name),
    email,
    role,
    canPost: role === "admin" || Number(r.can_post) === 1,
    profession: r.profession ? String(r.profession) : null,
    banned: !!r.banned_at,
    createdAt: String(r.created_at),
  };
}

const COLUMNS = "id, name, email, role, can_post, profession, banned_at, created_at";

/** Daftar akun untuk dashboard. Admin di urutan teratas, lalu penulis, lalu anggota terbaru. */
export async function listUsers(query: string, limit = 100): Promise<UserRecord[]> {
  const q = query.trim().slice(0, 80);
  const like = `%${escapeLike(q)}%`;
  const result = await db.execute({
    sql: `SELECT ${COLUMNS} FROM users
          WHERE (? = '' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')
          ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, can_post DESC, created_at DESC
          LIMIT ?`,
    args: [q, like, like, limit],
  });
  return result.rows.map((r) => toRecord(r as unknown as Record<string, unknown>));
}

export async function getUserRecord(id: string): Promise<UserRecord | null> {
  const result = await db.execute({ sql: `SELECT ${COLUMNS} FROM users WHERE id = ?`, args: [id] });
  return result.rows[0] ? toRecord(result.rows[0] as unknown as Record<string, unknown>) : null;
}

/** Memberi/mencabut izin menulis. Akun admin tidak bisa diubah lewat sini. */
export async function setCanPost(userId: string, value: boolean): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE users SET can_post = ? WHERE id = ? AND role != 'admin'",
    args: [value ? 1 : 0, userId],
  });
  invalidateTag(`user:${userId}`);
  return result.rowsAffected > 0;
}

// ---- Job ---------------------------------------------------------------------------------------

export const JOB_MAX_LENGTH = 60;

export type JobEditResult = "ok" | "forbidden" | "privileged" | "notFound";

/**
 * Siapa boleh mengubah job siapa:
 * - Admin: semua akun, job apa pun.
 * - Pemegang job pengelola (Founder, dll.): hanya akun biasa yang jobnya bukan job pengelola, dan hanya
 *   ke job yang bukan job pengelola. Jadi hak ini tidak bisa menyebar atau dicabut dari sesama pengelola.
 * Dipakai server untuk memutuskan dan oleh halaman untuk menentukan baris mana yang bisa diedit.
 */
export function canEditJobOf(actor: SessionUser, target: UserRecord): boolean {
  if (actor.role === "admin") return true;
  if (!actor.canManageJobs) return false;
  return target.role !== "admin" && !isManagerJob(target.profession);
}

export async function setJob(actor: SessionUser, targetId: string, job: string | null): Promise<JobEditResult> {
  if (!actor.canManageJobs) return "forbidden";
  const target = await getUserRecord(targetId);
  if (!target) return "notFound";
  if (!canEditJobOf(actor, target)) return "forbidden";
  if (actor.role !== "admin" && isManagerJob(job)) return "privileged";
  await updateProfession(targetId, job);
  return "ok";
}

// ---- Blokir dan hapus (hanya admin; dicek oleh pemanggil) -----------------------------------------

/** Admin tidak bisa diblokir atau dihapus lewat halaman ini, dan tidak bisa menyerang dirinya sendiri. */
export function canModerate(actor: SessionUser, target: UserRecord): boolean {
  return actor.role === "admin" && target.role !== "admin" && target.id !== actor.id;
}

export async function setBanned(actor: SessionUser, targetId: string, banned: boolean): Promise<boolean> {
  const target = await getUserRecord(targetId);
  if (!target || !canModerate(actor, target)) return false;

  await db.batch(
    [
      { sql: "UPDATE users SET banned_at = ? WHERE id = ?", args: [banned ? new Date().toISOString() : null, targetId] },
      // Diblokir = langsung keluar dari semua perangkat.
      ...(banned ? [{ sql: "DELETE FROM sessions WHERE user_id = ?", args: [targetId] }] : []),
    ],
    "write",
  );
  // Membuang sesi yang ter-cache di instance ini; instance lain menyusul setelah `sessionSeconds`.
  invalidateTag(`user:${targetId}`);
  return true;
}

/**
 * Menghapus akun beserta komentar, suka, dan relasi ikutnya. Artikelnya TIDAK dihapus: artikel tetap
 * tampil dengan nama penulis (tanpa tautan profil), karena menghapus artikel publik karena akunnya
 * dihapus bisa merusak tautan dan tidak bisa dibatalkan.
 */
export async function deleteUser(actor: SessionUser, targetId: string): Promise<boolean> {
  const target = await getUserRecord(targetId);
  if (!target || !canModerate(actor, target)) return false;

  // Catat dulu apa saja yang terdampak, untuk membuang cache-nya setelah penghapusan.
  const [commented, liked, followed] = await Promise.all([
    db.execute({ sql: "SELECT DISTINCT post_id FROM comments WHERE user_id = ?", args: [targetId] }),
    db.execute({ sql: "SELECT post_id FROM likes WHERE user_id = ?", args: [targetId] }),
    db.execute({ sql: "SELECT following_id FROM follows WHERE follower_id = ?", args: [targetId] }),
  ]);

  await db.batch(
    [
      { sql: "DELETE FROM sessions WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM comments WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM likes WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM follows WHERE follower_id = ? OR following_id = ?", args: [targetId, targetId] },
      { sql: "UPDATE posts SET author_id = NULL WHERE author_id = ?", args: [targetId] },
      { sql: "DELETE FROM users WHERE id = ?", args: [targetId] },
    ],
    "write",
  );

  const tags = new Set<string>(["posts", `user:${targetId}`]);
  for (const r of commented.rows) tags.add(`comments:${r.post_id}`).add(`post:${r.post_id}`);
  for (const r of liked.rows) tags.add(`post:${r.post_id}`);
  for (const r of followed.rows) tags.add(`user:${r.following_id}`);
  invalidateTag(...tags);
  return true;
}
