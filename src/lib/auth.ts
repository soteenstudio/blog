import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AstroCookies } from "astro";
import { ADMIN_EMAILS } from "astro:env/server";
import { cacheConfig, jobManagerProfessions } from "@/data/site";
import { cached, invalidateKey } from "./cache";
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
  /** True untuk admin dan untuk pemegang job pengelola (Founder, dll.): boleh membuka halaman Kelola akun. */
  canManageJobs: boolean;
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

/** Peran efektif: kolom role di database atau terdaftar di ADMIN_EMAILS. */
export const roleOf = (dbRole: unknown, email: string): Role => (dbRole === "admin" || isListedAdmin(email) ? "admin" : "user");

const normalizeJob = (job: string) => job.toLowerCase().replace(/[^a-z0-9]+/g, "");
const managerJobs = new Set(jobManagerProfessions.map(normalizeJob));

/** Apakah job ini termasuk daftar pengelola (Founder, dll.)? */
export const isManagerJob = (job: string | null | undefined) => !!job && managerJobs.has(normalizeJob(job));

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

interface CachedSession {
  user: SessionUser;
  expiresAt: number;
}

/**
 * Sesi di-cache singkat supaya setiap permintaan tidak perlu query ke database. Logout membuang
 * cache di instance yang menangani; di instance lain pencabutan sesi berlaku paling lama
 * `sessionSeconds` kemudian.
 */
export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const session = await cached(
    `session:${hashToken(token)}`,
    {
      ttl: cacheConfig.sessionSeconds,
      staleIfError: 300,
      tags: (s: CachedSession | null) => (s ? [`user:${s.user.id}`] : []),
    },
    () => loadSession(token),
  );
  if (!session || session.expiresAt < Date.now()) return null;
  return session.user;
}

async function loadSession(token: string): Promise<CachedSession | null> {
  const result = await db.execute({
    sql: `SELECT u.id, u.name, u.email, u.role, u.can_post, u.profession, u.avatar_version, u.banned_at, s.expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ?`,
    args: [hashToken(token)],
  });
  const row = result.rows[0];
  if (!row) return null;

  // Akun yang diblokir tidak punya sesi yang sah, walau tokennya masih ada.
  if (row.banned_at) {
    await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [String(row.id)] });
    return null;
  }

  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [hashToken(token)] });
    return null;
  }

  const email = String(row.email);
  const role = roleOf(row.role, email);
  const profession = row.profession ? String(row.profession) : null;

  return {
    expiresAt: new Date(String(row.expires_at)).getTime(),
    user: {
      id: String(row.id),
      name: String(row.name),
      email,
      role,
      profession,
      avatarVersion: row.avatar_version ? String(row.avatar_version) : null,
      canPost: role === "admin" || Number(row.can_post) === 1,
      canManageJobs: role === "admin" || isManagerJob(profession),
    },
  };
}

export async function destroySession(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [hashToken(token)] });
    invalidateKey(`session:${hashToken(token)}`);
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
    sql: "SELECT id, name, email, role, password_hash, banned_at FROM users WHERE email = ?",
    args: [normalizeEmail(email)],
  });
  const row = result.rows[0];
  if (!row) return null;
  return { id: String(row.id), passwordHash: String(row.password_hash), banned: !!row.banned_at };
}

/** Selalu menghitung hash walau user tidak ada, supaya waktu respons tidak membocorkan email terdaftar. */
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export type AuthResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "banned" };

/** Status "banned" hanya dibuka bila kata sandinya benar, supaya orang lain tidak bisa mengintip status akun. */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { ok: false, reason: "invalid" };
  if (user.banned) return { ok: false, reason: "banned" };
  return { ok: true, userId: user.id };
}

/** Hanya izinkan path internal untuk parameter ?next= agar tidak jadi open redirect. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
