import { db } from "./db";
import { isListedAdmin, type Role } from "./auth";
import { invalidateTag } from "./cache";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  canPost: boolean;
  createdAt: string;
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, "\\$&");

/** Daftar akun untuk dashboard izin. Admin di urutan teratas, lalu penulis, lalu anggota terbaru. */
export async function listUsers(query: string, limit = 100): Promise<UserRecord[]> {
  const q = query.trim().slice(0, 80);
  const like = `%${escapeLike(q)}%`;
  const result = await db.execute({
    sql: `SELECT id, name, email, role, can_post, created_at FROM users
          WHERE (? = '' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')
          ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, can_post DESC, created_at DESC
          LIMIT ?`,
    args: [q, like, like, limit],
  });
  return result.rows.map((r) => {
    const email = String(r.email);
    const role: Role = r.role === "admin" || isListedAdmin(email) ? "admin" : "user";
    return {
      id: String(r.id),
      name: String(r.name),
      email,
      role,
      canPost: role === "admin" || Number(r.can_post) === 1,
      createdAt: String(r.created_at),
    };
  });
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
