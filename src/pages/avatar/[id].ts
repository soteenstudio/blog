import type { APIRoute } from "astro";
import { getAvatar } from "@/lib/profile";

/** Menyajikan foto profil dari database. URL memuat ?v=<versi>, jadi aman di-cache lama. */
export const GET: APIRoute = async ({ params, url }) => {
  const avatar = await getAvatar(params.id ?? "");
  if (!avatar) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mime,
      "Content-Length": String(avatar.data.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      // s-maxage: CDN Vercel ikut menyimpan, jadi foto yang sama tidak memanggil fungsi (dan Turso) lagi.
      "Cache-Control": url.searchParams.has("v")
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=300, s-maxage=300",
    },
  });
};
