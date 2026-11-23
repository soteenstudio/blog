import { TURNSTILE_SECRET_KEY, TURNSTILE_SITE_KEY } from "astro:env/server";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const FIELD = "cf-turnstile-response";

/** Aktif hanya bila kedua kunci diisi. Tanpa itu, form tetap jalan (mis. saat pengembangan lokal). */
export const turnstileSiteKey = TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY ? TURNSTILE_SITE_KEY : null;

let warned = false;
function warnDisabled() {
  if (warned) return;
  warned = true;
  const where = import.meta.env.PROD ? "PRODUKSI" : "dev";
  console.warn(
    `[turnstile] TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY belum diisi (${where}): verifikasi captcha DILEWATI.`,
  );
}

export type TurnstileResult = "ok" | "failed" | "unavailable";

/**
 * Memverifikasi token Turnstile di server Cloudflare. Token hanya berlaku sekali dan sekitar 5 menit,
 * jadi verifikasi wajib di server: widget di browser saja bisa dilewati begitu saja oleh bot.
 *
 * - "failed": token kosong, salah, kedaluwarsa, atau sudah dipakai.
 * - "unavailable": Cloudflare tidak terjangkau; ditolak (fail closed) dengan pesan "coba lagi".
 */
export async function verifyTurnstile(
  form: FormData,
  ip: string,
  expectedAction: "login" | "register",
): Promise<TurnstileResult> {
  if (!turnstileSiteKey) {
    warnDisabled();
    return "ok";
  }

  const token = form.get(FIELD);
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return "failed";

  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY!, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { success?: boolean; action?: string };
    if (data.success !== true) return "failed";
    // Token dari form lain (mis. form daftar dipakai untuk login) ditolak.
    if (data.action && data.action !== expectedAction) return "failed";
    return "ok";
  } catch {
    return "unavailable";
  }
}
