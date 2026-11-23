import { defineMiddleware } from "astro:middleware";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getCopy, isLocale } from "@/data/copy/index";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { isNeutralPath, splitLocale, withLocale } from "@/lib/i18n";
import { isSameOrigin, isUnsafeMethod } from "@/lib/same-origin";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, locals } = context;

  // Tolak permintaan pengubah data yang datang dari situs lain (CSRF).
  if (isUnsafeMethod(request.method) && !isSameOrigin(request)) {
    return new Response("Cross-site requests are forbidden", { status: 403 });
  }

  // Permintaan hasil rewrite internal (mis. ke /404 atau /403) tidak perlu diproses ulang.
  if (locals.copy) return next();

  // Bahasa antarmuka: dari awalan URL (/id atau /en), cadangannya cookie pilihan pengunjung, lalu Indonesia.
  const { locale: urlLocale, path: barePath } = splitLocale(url.pathname);
  const cookieLocale = cookies.get(LOCALE_COOKIE)?.value;
  const preferred = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const neutral = isNeutralPath(barePath);
  const isRead = request.method === "GET" || request.method === "HEAD";

  // Alamat tanpa awalan bahasa: arahkan ke versi berawalan (hanya untuk halaman yang dibaca).
  if (!urlLocale && !neutral && isRead) {
    return context.redirect(withLocale(preferred, url.pathname + url.search), 302);
  }

  // Form yang terlanjur dikirim ke alamat berawalan: lanjutkan ke alamat tanpa awalan dengan method dan isi yang sama.
  if (urlLocale && !isRead) {
    return context.redirect(barePath + url.search, 307);
  }

  const locale = urlLocale ?? preferred;
  locals.locale = locale;
  locals.copy = getCopy(locale);
  /** Path + query tanpa awalan bahasa; dipakai untuk tombol bahasa, canonical, dan parameter ?next=. */
  locals.path = barePath + url.search;
  locals.href = (path: string) => withLocale(locale, path);

  // Ingat bahasa terakhir yang dibuka, untuk halaman tanpa awalan (API, form) dan kunjungan berikutnya.
  if (urlLocale && urlLocale !== cookieLocale) {
    cookies.set(LOCALE_COOKIE, urlLocale, {
      path: "/",
      sameSite: "lax",
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const token = cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(token) : null;
  locals.user = user;

  const toLogin = () => context.redirect(withLocale(locale, `/login?next=${encodeURIComponent(barePath)}`));

  if (barePath === "/dashboard" || barePath.startsWith("/dashboard/")) {
    if (!user) return toLogin();
    // Dashboard artikel: admin dan akun yang diberi izin menulis.
    // Halaman izin (/dashboard/users): hanya admin.
    const adminOnly = barePath === "/dashboard/users" || barePath.startsWith("/dashboard/users/");
    const allowed = adminOnly ? user.role === "admin" : user.canPost;
    if (!allowed) {
      locals.forbidden = adminOnly ? "admin" : "author";
      return context.rewrite("/403");
    }
  }

  // Halaman /admin lama (kelola semua artikel): hanya admin.
  if (barePath === "/admin" || barePath.startsWith("/admin/")) {
    if (!user) return toLogin();
    if (user.role !== "admin") {
      locals.forbidden = "admin";
      return context.rewrite("/403");
    }
  }

  if ((barePath === "/profile" || barePath.startsWith("/profile/")) && !user) return toLogin();

  // Alamat berawalan dilayani oleh halaman yang sama tanpa awalan.
  const response = urlLocale ? await next((barePath === "/" ? "/" : barePath) + url.search) : await next();

  // Halaman berisi data per-pengguna (suka, komentar, menu akun): jangan di-cache bersama.
  if (user && !response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
});
