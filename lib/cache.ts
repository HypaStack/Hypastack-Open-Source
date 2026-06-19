import { getRedis } from './redis'

// ── Cache-Aside Pattern ───────────────────────────────────────────────────
// Every call is wrapped in try/catch. If Redis is down, we silently fall
// through to the fetcher (Postgres). The app NEVER crashes due to cache.

/** Global key prefix to avoid collisions with other PM2 apps on the same Redis */
const PREFIX = 'hs:'

function prefixed(key: string): string {
  return `${PREFIX}${key}`
}

const inflight = new Map<string, Promise<any>>()

/**
 * Cache-aside: check Redis first, fall through to fetcher on miss/error.
 * Uses Promise deduplication to prevent Cache Stampedes.
 * 
 * @param key   - Cache key (will be auto-prefixed with `hs:`)
 * @param ttl   - Time-to-live in seconds
 * @param fetcher - Async function that queries Postgres
 */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const prefixedKey = prefixed(key)

  if (inflight.has(prefixedKey)) {
    return inflight.get(prefixedKey)
  }

  const promise = (async () => {
    const redis = getRedis()

    // 1. Try cache hit
    if (redis) {
      try {
        const raw = await redis.get(prefixedKey)
        if (raw !== null) {
          return JSON.parse(raw) as T
        }
      } catch (err) {
        console.warn(`[Cache] GET failed for "${key}":`, (err as Error).message)
      }
    }

    // 2. Cache miss (or Redis unavailable) → query Postgres
    const data = await fetcher()

    // 3. Populate cache (fire-and-forget, never block the response)
    if (redis) {
      try {
        await redis.set(prefixedKey, JSON.stringify(data), 'EX', ttl)
      } catch (err) {
        console.warn(`[Cache] SET failed for "${key}":`, (err as Error).message)
      }
    }

    return data
  })()

  inflight.set(prefixedKey, promise)
  try {
    return await promise
  } finally {
    inflight.delete(prefixedKey)
  }
}

/**
 * Bust one or more cache keys immediately.
 * Used after mutations (create, update, delete).
 */
export async function bustCache(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return

  try {
    await redis.del(...keys.map(prefixed))
  } catch (err) {
    console.warn('[Cache] DEL failed:', (err as Error).message)
  }
}

/**
 * Bust all keys matching a glob pattern.
 * Uses SCAN (non-blocking) instead of KEYS (blocking).
 * Example: bustCachePattern('forum:listing:*')
 */
export async function bustCachePattern(pattern: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const fullPattern = prefixed(pattern)
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (err) {
    console.warn(`[Cache] Pattern bust failed for "${pattern}":`, (err as Error).message)
  }
}
