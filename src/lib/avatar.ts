/** Alamat gambar profil; `version` mengubah URL setiap foto diganti sehingga cache browser tidak basi. */
export const avatarUrl = (userId: string, version: string | null | undefined) =>
  version ? `/avatar/${encodeURIComponent(userId)}?v=${encodeURIComponent(version)}` : null;

export const MAX_AVATAR_BYTES = 200_000;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export type ParsedAvatar = { mime: "image/jpeg" | "image/png" | "image/webp"; base64: string; bytes: number };

/** Memvalidasi data URL dari klien: tipe yang diizinkan, ukuran, dan tanda file asli (magic bytes). */
export function parseAvatarDataUrl(value: unknown): ParsedAvatar | "invalid" | "too-large" {
  if (typeof value !== "string" || value.length > MAX_AVATAR_BYTES * 1.5) {
    return typeof value === "string" ? "too-large" : "invalid";
  }
  const match = DATA_URL.exec(value);
  if (!match) return "invalid";

  const mime = match[1] as ParsedAvatar["mime"];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) return "invalid";
  if (buffer.length > MAX_AVATAR_BYTES) return "too-large";

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
  const ok = (mime === "image/jpeg" && isJpeg) || (mime === "image/png" && isPng) || (mime === "image/webp" && isWebp);
  return ok ? { mime, base64: match[2], bytes: buffer.length } : "invalid";
}
