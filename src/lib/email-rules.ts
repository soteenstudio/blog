/**
 * Aturan email yang murni (tanpa API Node), jadi dipakai sama persis oleh server dan oleh skrip di
 * browser untuk umpan balik langsung. Pemeriksaan yang butuh jaringan (MX) ada di email-check.ts.
 */

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/;

/** TLD cadangan RFC 6761/2606 yang pasti bukan alamat nyata. */
const RESERVED_TLDS = new Set(["test", "example", "invalid", "localhost", "local", "internal", "lan", "home"]);

/**
 * Domain yang ditolak (termasuk semua subdomainnya). Isinya: domain "isi asal" dan email sekali
 * pakai yang umum. Tambah domain lain lewat env BLOCKED_EMAIL_DOMAINS tanpa mengubah kode.
 */
export const BLOCKED_DOMAINS: readonly string[] = [
  // asal-asalan / contoh
  "ngasal.com",
  "ngasal.net",
  "ngasal.id",
  "asal.com",
  "asalan.com",
  "example.com",
  "example.net",
  "example.org",
  "contoh.com",
  "test.com",
  "tes.com",
  "testing.com",
  "email.com",
  "mail.com",
  "domain.com",
  "yourdomain.com",
  "abc.com",
  "xyz.com",
  "aaa.com",
  "asd.com",
  "asdf.com",
  "qwerty.com",
  "fake.com",
  "fakemail.com",
  "noemail.com",
  "nomail.com",
  "none.com",
  // email sekali pakai
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.net",
  "tempail.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trash-mail.com",
  "yopmail.com",
  "yopmail.net",
  "yopmail.fr",
  "getnada.com",
  "nada.email",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "emailondeck.com",
  "fakeinbox.com",
  "spamgourmet.com",
  "mytemp.email",
  "burnermail.io",
  "anonaddy.me",
  "moakt.com",
  "tmail.ws",
  "tmpmail.org",
  "tmpmail.net",
  "inboxkitten.com",
  "mailcatch.com",
  "discard.email",
  "dropmail.me",
  "emailfake.com",
  "crazymailing.com",
  "harakirimail.com",
  "33mail.com",
  "spambox.us",
  "mailforspam.com",
  "luxusmail.org",
];

/** Kata yang bila ada di nama domain, hampir pasti isian asal (mis. ngasal123.com). */
const BLOCKED_DOMAIN_WORDS = ["ngasal", "asalasalan", "tempmail", "mailinator", "guerrillamail", "yopmail"];

/** Salah ketik populer pada penyedia besar -> penulisan yang benar. */
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.id": "gmail.com",
  "gmail.net": "gmail.com",
  "gemail.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

export type EmailProblem = "invalid" | "blocked" | "typo";

export type EmailCheck =
  | { ok: true; email: string; domain: string }
  | { ok: false; problem: EmailProblem; suggestion?: string };

export const MAX_EMAIL_LENGTH = 254;

export function isBlockedDomain(domain: string, extra: readonly string[] = []): boolean {
  const labels = domain.split(".");
  // Cocokkan domain itu sendiri dan setiap induknya: a.b.ngasal.com -> b.ngasal.com -> ngasal.com
  const blocked = new Set([...BLOCKED_DOMAINS, ...extra]);
  for (let i = 0; i < labels.length - 1; i++) {
    if (blocked.has(labels.slice(i).join("."))) return true;
  }
  return BLOCKED_DOMAIN_WORDS.some((w) => domain.includes(w));
}

/** Parsing parameter env berisi daftar dipisah koma. */
export function parseDomainList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** Memeriksa bentuk email, domain terlarang, dan salah ketik umum. Tidak membuka jaringan. */
export function checkEmail(raw: string, extraBlocked: readonly string[] = []): EmailCheck {
  const email = raw.normalize("NFKC").trim().toLowerCase();
  const invalid: EmailCheck = { ok: false, problem: "invalid" };

  if (!email || email.length > MAX_EMAIL_LENGTH) return invalid;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return invalid;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || !LOCAL_RE.test(local)) return invalid;

  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l))) return invalid;
  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld) || RESERVED_TLDS.has(tld)) return invalid;

  if (isBlockedDomain(domain, extraBlocked)) return { ok: false, problem: "blocked" };

  const suggestion = TYPO_DOMAINS[domain];
  if (suggestion) return { ok: false, problem: "typo", suggestion };

  return { ok: true, email, domain };
}
