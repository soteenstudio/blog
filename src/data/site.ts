/** Identitas studio. Samakan dengan data/structure.ts di web utama bila berubah. */
export const siteConfig = {
  name: "SoTeen Studio",
  blogLabel: "Blog",
  postsPerPage: 9,
  commentMaxLength: 1000,
  commentsLimit: 200,
} as const;

/**
 * Lama data disimpan di cache memori (detik) sebelum dibaca ulang dari Turso.
 * Makin besar angkanya, makin hemat kuota database; makin kecil, makin cepat perubahan terlihat
 * di instance lain (di instance yang menulis, cache dibuang seketika). 0 = matikan cache itu.
 */
export const cacheConfig = {
  listSeconds: 60,
  postSeconds: 60,
  commentsSeconds: 30,
  profileSeconds: 60,
  sessionSeconds: 30,
  avatarSeconds: 300,
  existsSeconds: 60,
  /** Berapa lama data lama boleh dipakai bila Turso error atau kuotanya habis. */
  staleIfErrorSeconds: 3600,
} as const;

/** Batas permintaan: { max, windowMs } per kunci. Tiap instance menghitung sendiri. */
export const limits = {
  /** Semua permintaan halaman per IP. */
  pagesPerIp: { max: 120, windowMs: 60_000 },
  /** Permintaan pengubah data (POST/PUT/PATCH/DELETE) per IP. */
  writesPerIp: { max: 60, windowMs: 60_000 },
  /** Foto profil per IP (kena database hanya bila belum ada di cache). */
  avatarPerIp: { max: 300, windowMs: 60_000 },
  commentsPerHour: { max: 60, windowMs: 60 * 60_000 },
  commentDeletePerMinute: { max: 30, windowMs: 60_000 },
  avatarRemovePerMinute: { max: 10, windowMs: 60_000 },
  /** Percobaan masuk per IP, dan per alamat email (melindungi satu akun dari tebakan dari banyak IP). */
  loginPerIp: { max: 10, windowMs: 15 * 60_000 },
  loginPerEmail: { max: 8, windowMs: 15 * 60_000 },
  /** Pendaftaran yang lolos validasi awal, per IP. */
  registerPerIp: { max: 5, windowMs: 60 * 60_000 },
} as const;

/**
 * Job yang boleh mengatur job akun lain, selain admin. Dicocokkan tanpa peduli huruf besar/kecil, spasi,
 * atau tanda hubung ("Co-Founder" = "cofounder"). Pemegang job ini hanya bisa mengatur job akun biasa:
 * memberi atau mengubah job dari daftar ini tetap hak admin, supaya hak ini tidak bisa diwariskan sendiri.
 */
export const jobManagerProfessions = ["Founder", "Co-Founder", "Owner", "CEO", "CTO", "COO"] as const;

export type SocialIcon = "linkedin" | "github" | "instagram";

export const socialLinks: { label: string; href: string; icon: SocialIcon }[] = [
  { label: "LinkedIn", href: "#", icon: "linkedin" },
  { label: "GitHub", href: "https://github.com/soteenstudio", icon: "github" },
  { label: "Instagram", href: "https://instagram.com/soteenstudio", icon: "instagram" },
];

export const legalLinks = [
  { id: "privacy", href: "https://policies.soteenstudio.my.id/privacy" },
  { id: "terms", href: "https://policies.soteenstudio.my.id/terms" },
  { id: "cookies", href: "https://policies.soteenstudio.my.id/cookies" },
] as const;

/** Saran untuk kolom profesi (bebas diisi lain). Tidak mengikat. */
export const professionSuggestions = [
  "Game Designer",
  "Systems Engineer",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "3D Artist",
  "Community Manager",
];
