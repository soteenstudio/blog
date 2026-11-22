import type { APIRoute } from "astro";
import { LOCALE_COOKIE, isLocale } from "@/data/copy/index";
import { safeNextPath } from "@/lib/auth";

/** Menyimpan pilihan bahasa di cookie lalu kembali ke halaman asal. */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const lang = form.get("lang");
  const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : "/");

  if (isLocale(lang)) {
    cookies.set(LOCALE_COOKIE, lang, {
      path: "/",
      sameSite: "lax",
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return redirect(next, 303);
};
