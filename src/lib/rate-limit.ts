interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitStatus {
  ok: boolean;
  /** Detik sampai jendela berikutnya (untuk header Retry-After). */
  retryAfter: number;
}

/**
 * Pembatas laju di memori proses (jendela tetap). Tiap instance server menghitung sendiri, jadi di
 * Vercel batasnya berlaku per instance; cukup untuk meredam spam dan bot sederhana. Untuk batas yang
 * persis di semua instance, pindahkan ke penyimpanan bersama (Redis/KV), bukan Turso, supaya tidak
 * memakan kuota database.
 */
export function rateLimitStatus(key: string, max: number, windowMs: number): RateLimitStatus {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return { ok: bucket.count <= max, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

/** Mengembalikan true bila permintaan masih diizinkan. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  return rateLimitStatus(key, max, windowMs).ok;
}

export function clientKey(getAddress: () => string): string {
  try {
    return getAddress() || "unknown";
  } catch {
    return "unknown";
  }
}
