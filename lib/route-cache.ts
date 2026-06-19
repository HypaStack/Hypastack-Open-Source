import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getRedis } from "@/lib/redis"

export interface RouteCacheOptions {
  /** Time-to-live in seconds */
  ttl: number
  /** Base key for this route (e.g. 'api:auth:me') */
  baseKey: string
  /** Whether the route requires a logged in user. If true and no user, returns 401 early. Default: true */
  requireAuth?: boolean
}

/**
 * Route-level caching wrapper for Next.js App Router Node.js API handlers.
 * Caches the entire JSON response to skip controller logic completely.
 * Securely scopes the cache key to the authenticated user's ID.
 */
export function withRouteCache(
  handler: (req: NextRequest, params: any) => Promise<NextResponse>,
  opts: RouteCacheOptions
) {
  return async (req: NextRequest, params: any): Promise<NextResponse> => {
    let userId = 'public'

    const requireAuth = opts.requireAuth !== false

    if (requireAuth) {
      const user = await getCurrentUser(req)
      if (!user) {
        return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 })
      }
      userId = user.userId
    } else {
      // Even if not strictly required, try to scope by user if they have a token
      const user = await getCurrentUser(req)
      if (user) {
        userId = user.userId
      }
    }

    const redis = getRedis()
    const url = new URL(req.url)
    
    // Sort search parameters to ensure consistent cache keys regardless of param order
    const searchParams = new URLSearchParams(url.search)
    searchParams.sort()
    const query = searchParams.toString()
    
    const key = `hs:route:${userId}:${opts.baseKey}:${query}`

    // 1. Try cache hit
    if (redis) {
      try {
        const cachedStr = await redis.get(key)
        if (cachedStr) {
          const { status, headers, body } = JSON.parse(cachedStr)
          
          // Reconstruct the response with cached headers (except set-cookie)
          const newHeaders = new Headers(headers)
          newHeaders.set('x-cache', 'HIT')
          newHeaders.set('Cache-Control', `public, max-age=${opts.ttl}, stale-while-revalidate=${opts.ttl * 2}`)
          
          return new NextResponse(body, { 
            status, 
            headers: newHeaders 
          })
        }
      } catch (err) {
        console.warn('[RouteCache] GET failed:', (err as Error).message)
      }
    }

    // 2. Cache miss -> run original handler
    const response = await handler(req, params)

    // 3. Cache the response (only if 200 OK)
    if (redis && response.status === 200) {
      try {
        // We must clone the response to read its body without consuming the original stream
        const clone = response.clone()
        const body = await clone.text()
        const headers = Object.fromEntries(response.headers.entries())
        
        // Ensure we don't cache cache-control headers that might mess with clients
        delete headers['set-cookie']
        
        await redis.set(key, JSON.stringify({
          status: response.status,
          headers,
          body
        }), 'EX', opts.ttl)
        
        response.headers.set('x-cache', 'MISS')
        response.headers.set('Cache-Control', `public, max-age=${opts.ttl}, stale-while-revalidate=${opts.ttl * 2}`)
      } catch (err) {
        console.warn('[RouteCache] SET failed:', (err as Error).message)
      }
    }

    return response
  }
}

/**
 * Invalidate all route-level cache entries for a given user + route baseKey.
 * Call this after any mutation (delete, update) that would stale the cached response.
 *
 * @param userId  - The user whose cache to bust
 * @param baseKey - Must match the `baseKey` used in the corresponding withRouteCache call
 */
export async function bustRouteCache(userId: string, baseKey: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const pattern = `hs:route:${userId}:${baseKey}:*`
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (err) {
    console.warn(`[RouteCache] bust failed for ${userId}/${baseKey}:`, (err as Error).message)
  }
}
