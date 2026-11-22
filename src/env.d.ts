/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: import("./lib/auth").SessionUser | null;
    locale: import("./data/copy/index").Locale;
    copy: import("./data/copy/index").Copy;
    /** Diisi middleware saat akses ke /dashboard ditolak. */
    forbidden?: "admin" | "author";
  }
}
