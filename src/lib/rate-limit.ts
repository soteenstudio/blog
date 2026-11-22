interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Pembatas laju sederhana di memori proses. Cukup untuk satu instance server;
 * bila nanti berjalan di banyak instance/serverless, pindahkan ke penyimpanan bersama
 * (mis. tabel Turso atau Redis).
 * Mengembalikan true bila permintaan masih diizinkan.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

export function clientKey(getAddress: () => string): string {
  try {
    return getAddress();
  } catch {
    return "unknown";
  }
}
