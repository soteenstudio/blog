/**
 * Penaksir kekuatan kata sandi, murni (tanpa API Node) sehingga server dan browser memakai logika
 * yang sama persis: meter di form hanya tampilan, penolakan sesungguhnya terjadi di server.
 *
 * Ini heuristik, bukan jaminan, dan sengaja tidak menampilkan angka "waktu bobol": angka seperti itu
 * bergantung pada asumsi penyerang dan cara password disimpan sehingga mudah menyesatkan. Ia menurunkan nilai untuk kata sandi umum (termasuk variasi
 * leetspeak seperti "p@ssw0rd"), pola keyboard, urutan, pengulangan, tahun, dan bagian dari nama/email.
 */

export type Hint = "short" | "common" | "repeat" | "sequence" | "keyboard" | "personal" | "year" | "needMix" | "longer";

export interface Strength {
  /** 0 sangat lemah ... 4 sangat kuat */
  score: 0 | 1 | 2 | 3 | 4;
  bits: number;
  hints: Hint[];
}

/** Skor minimal yang boleh dipakai untuk mendaftar (2 = "Cukup"). */
export const MIN_SCORE = 2;
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "12345", "123456", "1234567", "11111111", "00000000", "87654321",
  "password", "password1", "password12", "password123", "passw0rd", "pass1234", "kata sandi", "katasandi",
  "qwerty", "qwerty123", "qwertyuiop", "qwertyui", "asdfghjk", "asdfghjkl", "zxcvbnm", "1q2w3e4r", "1qaz2wsx",
  "abc123", "abcd1234", "abcdefgh", "admin", "admin123", "administrator", "root", "toor", "login", "welcome",
  "letmein", "monkey", "dragon", "master", "shadow", "sunshine", "princess", "football", "baseball", "superman",
  "batman", "iloveyou", "trustno1", "freedom", "whatever", "hello", "hello123", "default", "guest", "user",
  "test", "test123", "testing", "tester", "secret", "changeme", "ganti", "gantiaja", "rahasia", "sandi",
  "indonesia", "indonesia1", "garuda", "merdeka", "jakarta", "bandung", "surabaya", "bismillah", "alhamdulillah",
  "sayang", "sayangku", "cintaku", "cinta", "ilovekamu", "akucintakamu", "kamu", "bahagia", "semangat",
  "kucing", "anjing", "bunga", "bintang", "mawar", "bola", "persib", "persija", "arema", "liverpool", "chelsea",
  "manchester", "barcelona", "realmadrid", "naruto", "sasuke", "goku", "pokemon", "minecraft", "roblox",
  "freefire", "mobilelegends", "genshin", "soteen", "soteenstudio", "blog", "ngasal", "asdasd", "asdf1234",
  "zaq12wsx", "q1w2e3r4", "mantap", "bebas", "pokoknya", "pasword", "sandi123",
]);

/** Kata umum yang melemahkan kata sandi bila menjadi bagian darinya. */
const WORDS = [
  "password", "passw", "qwerty", "admin", "welcome", "iloveyou", "letmein", "monkey", "dragon", "master",
  "login", "secret", "rahasia", "indonesia", "sayang", "cinta", "kucing", "bismillah", "soteen", "blog",
  "football", "sunshine", "princess", "naruto", "minecraft",
];

const KEYBOARD_ROWS = [
  "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "1qaz2wsx3edc", "qazwsxedc", "azertyuiop",
];

const LEET: Record<string, string> = { "@": "a", "4": "a", "8": "b", "3": "e", "0": "o", $: "s", "5": "s", "7": "t" };

function deleet(s: string, oneAs: "i" | "l"): string {
  let out = "";
  for (const ch of s) out += ch === "1" ? oneAs : (LEET[ch] ?? ch);
  return out;
}

const stripAffixes = (s: string) => s.replace(/^[^a-z]+|[^a-z]+$/g, "");

function isCommon(lower: string): boolean {
  if (COMMON.has(lower)) return true;
  for (const oneAs of ["i", "l"] as const) {
    // Dua urutan: buang angka/simbol di ujung lalu de-leet ("kucing123", "P@ssw0rd!"),
    // atau de-leet dulu lalu buang ujung ("h3ll0" -> "hello").
    const candidates = [deleet(lower, oneAs), deleet(stripAffixes(lower), oneAs), stripAffixes(deleet(lower, oneAs))];
    for (const c of candidates) if (c.length >= 4 && COMMON.has(c)) return true;
  }
  return COMMON.has(stripAffixes(lower)) && stripAffixes(lower).length >= 4;
}

function containsRun(s: string, sources: string[], min = 4): boolean {
  for (const src of sources) {
    for (const row of [src, [...src].reverse().join("")]) {
      for (let i = 0; i + min <= row.length; i++) if (s.includes(row.slice(i, i + min))) return true;
    }
  }
  return false;
}

export interface PasswordContext {
  name?: string;
  email?: string;
}

function personalTokens(ctx: PasswordContext): string[] {
  const out = new Set<string>();
  const add = (t: string) => {
    const v = t.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (v.length >= 3) out.add(v);
  };
  for (const part of (ctx.name ?? "").split(/\s+/)) add(part);
  const local = (ctx.email ?? "").split("@")[0] ?? "";
  add(local);
  for (const part of local.split(/[._+-]+/)) add(part);
  return [...out];
}

export function evaluatePassword(password: string, ctx: PasswordContext = {}): Strength {
  const hints: Hint[] = [];
  const length = [...password].length;

  if (length === 0) return { score: 0, bits: 0, hints: [] };

  const lower = password.toLowerCase();

  // Ukuran "kolam" karakter yang dipakai.
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  if (/[^\x00-\x7f]/.test(password)) pool += 20;
  pool = Math.max(pool, 10);

  // Panjang efektif: karakter berulang dan berurutan hampir tidak menambah kesulitan.
  const chars = [...password];
  let effective = 0;
  let repeated = false;
  let sequential = false;
  for (let i = 0; i < chars.length; i++) {
    if (i === 0) {
      effective += 1;
      continue;
    }
    const prev = chars[i - 1].toLowerCase().codePointAt(0)!;
    const cur = chars[i].toLowerCase().codePointAt(0)!;
    if (cur === prev) {
      effective += 0.2;
      repeated = true;
    } else if (Math.abs(cur - prev) === 1 && /[a-z0-9]/.test(chars[i].toLowerCase())) {
      effective += 0.4;
      sequential = true;
    } else {
      effective += 1;
    }
  }

  // Faktor 0.8: kata sandi buatan manusia kurang acak daripada taksiran teoretis.
  let bits = effective * Math.log2(pool) * 0.8;

  const common = isCommon(lower);
  const keyboard = containsRun(lower, KEYBOARD_ROWS);
  const year = /(?:19[5-9]\d|20[0-4]\d)/.test(password);

  const variants = [lower, deleet(lower, "i"), deleet(lower, "l")];
  const wordHits = WORDS.filter((w) => variants.some((v) => v.includes(w))).length;
  bits -= Math.min(wordHits, 2) * 12;

  const personal = personalTokens(ctx).some((t) => variants.some((v) => v.includes(t)));
  if (personal) bits -= 18;
  if (keyboard) bits -= 10;
  if (year) bits -= 5;
  if (repeated && /(.)\1{2,}/.test(lower)) bits -= 4;

  bits = Math.max(0, bits);
  if (common) bits = Math.min(bits, 10);

  if (length < MIN_LENGTH) hints.push("short");
  if (common) hints.push("common");
  if (repeated && /(.)\1{2,}/.test(lower)) hints.push("repeat");
  if (sequential && /(?:abc|bcd|cde|def|efg|012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|cba)/.test(lower)) hints.push("sequence");
  if (keyboard) hints.push("keyboard");
  if (personal) hints.push("personal");
  if (year) hints.push("year");

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 2 && length < 16) hints.push("needMix");

  let score: Strength["score"] = bits < 24 ? 0 : bits < 36 ? 1 : bits < 50 ? 2 : bits < 68 ? 3 : 4;
  if (length < MIN_LENGTH || (personal && length < 14)) score = Math.min(score, 1) as Strength["score"];

  if (score < 4 && length < 14 && !hints.includes("short")) hints.push("longer");

  return { score, bits: Math.round(bits), hints };
}
