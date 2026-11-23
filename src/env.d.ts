/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: import("./lib/auth").SessionUser | null;
    locale: import("./data/copy/index").Locale;
    /** Path + query tanpa awalan bahasa (/id, /en). */
    path: string;
    /** Menambah awalan bahasa saat ini ke path internal: href("/login") -> "/en/login". */
    href: (path: string) => string;
    copy: import("./data/copy/index").Copy;
    /** Diisi middleware saat akses ke /dashboard ditolak. */
    forbidden?: "admin" | "author" | "manager";
  }
}
