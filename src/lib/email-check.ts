import { promises as dns } from "node:dns";
import { BLOCKED_EMAIL_DOMAINS } from "astro:env/server";
import { checkEmail, parseDomainList, type EmailCheck } from "./email-rules";

const extraBlocked = parseDomainList(BLOCKED_EMAIL_DOMAINS);

/** Pemeriksaan bentuk + daftar blokir (termasuk BLOCKED_EMAIL_DOMAINS dari env). */
export const validateEmail = (raw: string): EmailCheck => checkEmail(raw, extraBlocked);

const MX_TIMEOUT_MS = 3000;
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { ok: boolean; until: number }>();

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error("dns timeout"), { code: "ETIMEOUT" })), MX_TIMEOUT_MS);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

/**
 * Apakah domain bisa menerima email? Domain yang tidak ada (NXDOMAIN) atau yang menyatakan "null MX"
 * ditolak. Bila DNS sendiri sedang bermasalah (timeout, SERVFAIL), hasilnya dianggap lolos supaya
 * pendaftar asli tidak ikut terblokir oleh gangguan jaringan.
 */
export async function domainCanReceiveMail(domain: string): Promise<boolean> {
  const hit = cache.get(domain);
  if (hit && hit.until > Date.now()) return hit.ok;

  let ok: boolean;
  try {
    const records = await withTimeout(dns.resolveMx(domain));
    // RFC 7505: satu MX dengan host "." berarti domain sengaja tidak menerima email.
    ok = records.some((r) => r.exchange && r.exchange !== ".");
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (NOT_FOUND.has(code)) {
      // Tanpa MX, RFC 5321 masih mengizinkan pengiriman ke record A/AAAA domain itu.
      try {
        const [a, aaaa] = await Promise.all([
          withTimeout(dns.resolve4(domain)).catch(() => []),
          withTimeout(dns.resolve6(domain)).catch(() => []),
        ]);
        ok = a.length + aaaa.length > 0;
      } catch {
        ok = true;
      }
    } else {
      return true; // gangguan DNS: jangan di-cache, jangan memblokir
    }
  }

  if (cache.size > 2000) cache.clear();
  cache.set(domain, { ok, until: Date.now() + CACHE_MS });
  return ok;
}
