const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const isUnsafeMethod = (method: string) => UNSAFE.has(method.toUpperCase());

/**
 * Perlindungan CSRF: permintaan yang mengubah data hanya diterima bila header Origin-nya sama dengan
 * host situs ini. Di balik proxy (Vercel, Nginx) host publik ada di X-Forwarded-Host; bila tidak ada,
 * dipakai header Host. Permintaan lintas situs membawa Origin situs lain sehingga ditolak.
 *
 * Ini menggantikan `security.checkOrigin` bawaan Astro, yang membandingkan dengan URL internal
 * (bisa berbeda protokol/host di Vercel) dan salah menolak form dari situs sendiri.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false; // mis. Origin: null
  }

  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host") || new URL(request.url).host;
  return originHost.toLowerCase() === host.toLowerCase();
}