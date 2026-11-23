/**
 * DAFTAR KATEGORI ARTIKEL: satu-satunya tempat yang perlu diubah.
 *
 * Menambah kategori : tambah satu objek di bawah (id unik, huruf kecil dan tanda hubung, plus label
 *                     tiap bahasa). Langsung muncul di pilihan form dan filter, tanpa migrasi.
 * Mengganti nama    : ubah `labels`, JANGAN ubah `id` (id disimpan di database).
 * Menghapus         : buang objeknya. Artikel yang memakainya tetap tampil (dengan id sebagai label)
 *                     sampai penulisnya memilih kategori baru. Untuk memindahkan semuanya sekaligus
 *                     ke kategori lain, jalankan: pnpm db:move-category <id-lama> <id-baru>
 * Bahasa baru       : tambahkan kunci bahasa itu di setiap `labels` (dan di data/copy).
 *
 * `aliases` = tulisan lama (teks bebas dari versi sebelumnya) yang dikenali sebagai kategori ini.
 * File ini .mjs supaya bisa dibaca juga oleh skrip migrasi di scripts/.
 *
 * @typedef {{ id: string, labels: { id: string, en: string }, aliases?: string[] }} CategoryDef
 */

/** Kategori bawaan untuk artikel baru: yang pertama di daftar. */
/** @type {CategoryDef[]} */
export const categories = [
  { id: "general", labels: { id: "Umum", en: "General" }, aliases: ["umum", "general"] },
  { id: "studio", labels: { id: "Studio", en: "Studio" } },
  { id: "game", labels: { id: "Game", en: "Games" }, aliases: ["games"] },
  { id: "open-source", labels: { id: "Open Source", en: "Open Source" }, aliases: ["opensource"] },
  { id: "experiments", labels: { id: "Eksperimen", en: "Experiments" }, aliases: ["eksperimen", "experiment"] },
];

/** Normalisasi untuk mencocokkan teks lama: huruf kecil, tanpa spasi/tanda baca. */
const norm = (/** @type {string} */ s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** @type {Map<string, CategoryDef>} */
const byKey = new Map();
for (const c of categories) {
  for (const key of [c.id, ...Object.values(c.labels), ...(c.aliases ?? [])]) byKey.set(norm(key), c);
}

/**
 * Mengubah masukan (id, label bahasa apa pun, atau tulisan lama) menjadi id kategori yang sah, atau
 * null bila tidak dikenal. Dipakai server, form, dan skrip migrasi.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function resolveCategoryId(value) {
  return value ? (byKey.get(norm(value))?.id ?? null) : null;
}
