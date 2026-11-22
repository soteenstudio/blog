import { en } from "./en";
import { id, type Copy } from "./id";

export type { Copy };
export type Locale = "id" | "en";

export const locales: { code: Locale; label: string; short: string; intl: string }[] = [
  { code: "id", label: "Bahasa Indonesia", short: "ID", intl: "id-ID" },
  { code: "en", label: "English", short: "EN", intl: "en-US" },
];

export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "lang";

const dictionaries: Record<Locale, Copy> = { id, en };

export const isLocale = (value: unknown): value is Locale => value === "id" || value === "en";

export const getCopy = (locale: Locale): Copy => dictionaries[locale];

export const intlLocale = (locale: Locale) => locales.find((l) => l.code === locale)!.intl;
