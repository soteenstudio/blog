import { defineMiddleware } from "astro:middleware";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getCopy, isLocale } from "@/data/copy/index";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { isSameOrigin, isUnsafeMethod } from "@/lib/same-origin";

export const onRequest = defineMiddleware(async (context, next) => {
  // Tolak permintaan pengubah data yang datang dari situs lain (CSRF).
  if (isUnsafeMethod(context.request.method) && !isSameOrigin(context.request)) {
    return new Response("Cross-site requests are forbidden", { status: 403 });
  }

  // Bahasa antarmuka: dari cookie pilihan pengunjung, bawaannya Indonesia.
  const cookieLocale = context.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  context.locals.locale = locale;
  context.locals.copy = getCopy(locale);

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(token) : null;
  context.locals.user = user;

  const path = context.url.pathname;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    if (!user) {
      return context.redirect(`/login?next=${encodeURIComponent(path)}`);
    }
    // Dashboard artikel: admin dan akun yang diberi izin menulis.
    // Halaman izin (/dashboard/users): hanya admin.
    const adminOnly = path === "/dashboard/users" || path.startsWith("/dashboard/users/");
    const allowed = adminOnly ? user.role === "admin" : user.canPost;
    if (!allowed) {
      context.locals.forbidden = adminOnly ? "admin" : "author";
      return context.rewrite("/403");
    }
  }

  if ((path === "/profile" || path.startsWith("/profile/")) && !user) {
    return context.redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const response = await next();
  // Halaman berisi data per-pengguna (suka, komentar, menu akun): jangan di-cache bersama.
  if (user && !response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
});