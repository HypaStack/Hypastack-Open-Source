import Redis from 'ioredis'

// ── Redis Client Singleton ────────────────────────────────────────────────
// Mirrors the db.ts pattern: one global instance, lazy-connected, with
// graceful degradation if the Redis server is unreachable.

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

let _redisDown = false        // suppress repeated error logs
let _downSince: number | null = null

declare global {
  // eslint-disable-next-line no-var
  var __hypaRedis: Redis | undefined
}

function createClient(): Redis {
  const client = new Redis(REDIS_URL, {
    db: 0,
    lazyConnect: true,            // don't block startup
    maxRetriesPerRequest: 1,      // fail fast → fall through to Postgres
    retryStrategy(times) {
      if (times > 20) return null  // stop reconnecting after 20 attempts
      return Math.min(times * 150, 3000) // exponential backoff, cap 3s
    },
    reconnectOnError(err) {
      // Reconnect on READONLY errors (e.g. failover scenarios)
      return err.message.includes('READONLY')
    },
    enableReadyCheck: true,
    connectTimeout: 5000,
  })

  client.on('connect', () => {
    if (_redisDown) {
      console.log(`[Redis] Reconnected after ${Math.round((Date.now() - (_downSince || Date.now())) / 1000)}s downtime`)
    } else {
      console.log('[Redis] Connected to', REDIS_URL)
    }
    _redisDown = false
    _downSince = null
  })

  client.on('error', (err) => {
    if (!_redisDown) {
      console.error('[Redis] Connection error:', err.message)
      _redisDown = true
      _downSince = Date.now()
    }
    // Subsequent errors are silently swallowed to avoid log spam
  })

  client.on('close', () => {
    if (!_redisDown) {
      console.warn('[Redis] Connection closed')
      _redisDown = true
      _downSince = Date.now()
    }
  })

  return client
}

/**
 * Returns the global Redis client instance.
 * Returns `null` if Redis is known to be down (avoids queuing commands).
 */
export function getRedis(): Redis | null {
  if (!globalThis.__hypaRedis) {
    globalThis.__hypaRedis = createClient()
    // Kick off connection (non-blocking)
    globalThis.__hypaRedis.connect().catch(() => {
      // Errors handled by event listener above
    })
  }
  if (_redisDown) return null
  return globalThis.__hypaRedis
}

/**
 * Health check for monitoring endpoints.
 */
export function isRedisHealthy(): boolean {
  return !_redisDown && globalThis.__hypaRedis?.status === 'ready'
}
