import { categories, resolveCategoryId } from "@/data/categories.mjs";
import type { Locale } from "@/data/copy/index";

export interface Category {
  id: string;
  labels: Record<Locale, string>;
  aliases?: string[];
}

const list = categories as Category[];

export { resolveCategoryId };

export const DEFAULT_CATEGORY_ID = list[0].id;

/** Daftar kategori sesuai urutan di data/categories.mjs, dengan label bahasa pembaca. */
export function categoryOptions(locale: Locale): { id: string; label: string }[] {
  return list.map((c) => ({ id: c.id, label: c.labels[locale] }));
}

/** Label untuk ditampilkan. Kategori yang sudah dihapus dari daftar tampil apa adanya (tidak error). */
export function categoryLabel(value: string, locale: Locale): string {
  const id = resolveCategoryId(value);
  const found = id ? list.find((c) => c.id === id) : undefined;
  return found ? found.labels[locale] : value;
}
