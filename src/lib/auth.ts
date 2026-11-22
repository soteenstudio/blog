import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AstroCookies } from "astro";
import { ADMIN_EMAILS } from "astro:env/server";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "soteen_blog_session";
const SESSION_DAYS = 30;

export type Role = "user" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  profession: string | null;
  avatarVersion: string | null;
  /** True untuk admin dan untuk akun yang diberi izin menulis oleh admin. */
  canPost: boolean;
}

/** Yang disimpan di database hanya hash token, jadi bocornya tabel sessions tidak membocorkan sesi aktif. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Daftar admin dari variabel ADMIN_EMAILS (email dipisah koma). Akun yang emailnya ada di daftar
 * otomatis menjadi admin; menghapus email dari daftar mencabut statusnya (kecuali sudah dijadikan
 * admin lewat `pnpm db:make-admin`).
 */
const listedAdmins = new Set(
  (ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean),
);

export const isListedAdmin = (email: string) => listedAdmins.has(normalizeEmail(email));

export async function createSession(cookies: AstroCookies, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.execute({ sql: "DELETE FROM sessions WHERE expires_at < ?", args: [new Date().toISOString()] });
  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [hashToken(token), userId, expires.toISOString()],
  });

  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    path: "/",
    expires,
  });
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const result = await db.execute({
    sql: `SELECT u.id, u.name, u.email, u.role, u.can_post, u.profession, u.avatar_version, s.expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ?`,
    args: [hashToken(token)],
  });
  const row = result.rows[0];
  if (!row) return null;

  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [hashToken(token)] });
    return null;
  }

  const email = String(row.email);
  const role: Role = row.role === "admin" || isListedAdmin(email) ? "admin" : "user";

  return {
    id: String(row.id),
    name: String(row.name),
    email,
    role,
    profession: row.profession ? String(row.profession) : null,
    avatarVersion: row.avatar_version ? String(row.avatar_version) : null,
    canPost: role === "admin" || Number(row.can_post) === 1,
  };
}

export async function destroySession(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [hashToken(token)] });
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    args: [id, input.name, normalizeEmail(input.email), await hashPassword(input.password)],
  });
  return id;
}

export async function findUserByEmail(email: string) {
  const result = await db.execute({
    sql: "SELECT id, name, email, role, password_hash FROM users WHERE email = ?",
    args: [normalizeEmail(email)],
  });
  const row = result.rows[0];
  if (!row) return null;
  return { id: String(row.id), passwordHash: String(row.password_hash) };
}

/** Selalu menghitung hash walau user tidak ada, supaya waktu respons tidak membocorkan email terdaftar. */
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function authenticate(email: string, password: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  return user && ok ? user.id : null;
}

/** Hanya izinkan path internal untuk parameter ?next= agar tidak jadi open redirect. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
