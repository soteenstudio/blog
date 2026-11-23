/**
 * Cache data di memori proses, untuk mengurangi pembacaan ke Turso.
 *
 * - TTL: data dianggap segar selama `ttl` detik, lalu dibaca ulang dari database.
 * - Stale-if-error: bila database gagal (mis. kuota Turso habis), data lama yang masih tersimpan
 *   tetap dipakai selama `staleIfError` detik, jadi blog tidak langsung error.
 * - Single-flight: banyak permintaan bersamaan untuk kunci yang sama hanya memicu satu query.
 * - Tag: `invalidateTag("posts")` membuang semua entri bertag itu (dipanggil setiap ada penulisan).
 *
 * Catatan: ini cache per instance. Di Vercel tiap instance serverless punya cache sendiri, jadi
 * penulisan hanya langsung terlihat di instance yang menanganinya; instance lain mengikuti TTL.
 * Nilai yang dikembalikan dipakai bersama, jadi perlakukan sebagai read-only.
 */

interface Entry {
  value: unknown;
  freshUntil: number;
  expireAt: number;
  tags: string[];
}

export interface CacheOptions<T> {
  /** Detik data dianggap segar. 0 = tanpa cache. */
  ttl: number;
  /** Detik tambahan data lama boleh dipakai bila pembacaan ulang gagal. */
  staleIfError?: number;
  /** Detik untuk hasil kosong (null/undefined), supaya URL ngawur tidak terus menembus ke database. */
  negativeTtl?: number;
  tags?: string[] | ((value: T) => string[]);
}

const DEFAULT_STALE_IF_ERROR = 3600;
const MAX_ENTRIES = 300;

const store = new Map<string, Entry>();
const tagIndex = new Map<string, Set<string>>();
const inflight = new Map<string, Promise<unknown>>();
/** Naik setiap ada invalidasi; hasil query yang mulai sebelum invalidasi tidak boleh disimpan. */
let epoch = 0;

function remove(key: string) {
  const entry = store.get(key);
  if (!entry) return;
  store.delete(key);
  for (const tag of entry.tags) {
    const keys = tagIndex.get(tag);
    keys?.delete(key);
    if (keys && keys.size === 0) tagIndex.delete(tag);
  }
}

function put(key: string, value: unknown, ttlMs: number, staleMs: number, tags: string[]) {
  remove(key);
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    remove(oldest);
  }
  const now = Date.now();
  store.set(key, { value, freshUntil: now + ttlMs, expireAt: now + ttlMs + staleMs, tags });
  for (const tag of tags) {
    let keys = tagIndex.get(tag);
    if (!keys) tagIndex.set(tag, (keys = new Set()));
    keys.add(key);
  }
}

export async function cached<T>(key: string, options: CacheOptions<T>, load: () => Promise<T>): Promise<T> {
  if (options.ttl <= 0) return load();

  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expireAt <= now) remove(key);
  const usable = hit && hit.expireAt > now ? hit : undefined;

  if (usable && usable.freshUntil > now) return usable.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const startedAt = epoch;
  const run = (async () => {
    try {
      const value = await load();
      if (startedAt === epoch) {
        const empty = value === null || value === undefined;
        const ttl = empty ? Math.min(options.ttl, options.negativeTtl ?? 15) : options.ttl;
        const tags = typeof options.tags === "function" ? options.tags(value) : (options.tags ?? []);
        put(key, value, ttl * 1000, (options.staleIfError ?? DEFAULT_STALE_IF_ERROR) * 1000, tags);
      }
      return value;
    } catch (error) {
      if (usable && usable.expireAt > Date.now()) {
        console.warn(`[cache] gagal memuat "${key}", memakai data lama:`, error);
        return usable.value as T;
      }
      throw error;
    } finally {
      if (inflight.get(key) === run) inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

/** Membuang semua entri yang punya salah satu tag. */
export function invalidateTag(...tags: string[]) {
  epoch++;
  for (const tag of tags) {
    for (const key of [...(tagIndex.get(tag) ?? [])]) {
      remove(key);
      inflight.delete(key);
    }
  }
}

export function invalidateKey(key: string) {
  epoch++;
  remove(key);
  inflight.delete(key);
}
