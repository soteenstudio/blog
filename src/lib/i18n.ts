import type { Locale } from "@/data/copy/index";

const LOCALE_PREFIX = /^\/(id|en)(\/.*)?$/;

/**
 * Rute teknis yang tidak punya awalan bahasa: API, avatar, logout, aset build, dan file statis
 * (yang berekstensi). Alamatnya tetap, bahasanya diambil dari cookie.
 */
const ASSET = /^\/(_astro|_image|@|node_modules|src)(\/|$)|\.[a-z0-9]+$/i;
const NEUTRAL = /^\/(api|avatar|_actions)(\/|$)|^\/logout$/i;

/** Aset statis (build, gambar, file berekstensi): tidak perlu sesi dan tidak dibatasi laju. */
export const isAssetPath = (pathname: string) => ASSET.test(pathname);

export const isNeutralPath = (pathname: string) => isAssetPath(pathname) || NEUTRAL.test(pathname);

/** "/en/posts/x" -> { locale: "en", path: "/posts/x" }; "/posts/x" -> { locale: null, path: "/posts/x" } */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const match = pathname.match(LOCALE_PREFIX);
  if (!match) return { locale: null, path: pathname };
  return { locale: match[1] as Locale, path: match[2] || "/" };
}

export const stripLocale = (pathname: string) => splitLocale(pathname).path;

/**
 * Menambah awalan bahasa ke path internal ("/posts/x?a=1#b" -> "/en/posts/x?a=1#b").
 * Aman dipanggil dua kali, dan membiarkan tautan eksternal, "#anchor", serta rute teknis apa adanya.
 */
export function withLocale(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const rest = cut === -1 ? "" : path.slice(cut);
  const bare = stripLocale(pathname);
  if (isNeutralPath(bare)) return path;
  return `/${locale}${bare === "/" ? "" : bare}${rest}`;
}
