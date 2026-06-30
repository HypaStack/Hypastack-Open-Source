/**
 * lib/fetch.ts
 *
 * Drop-in replacement for `fetch()` on the client side.
 * Automatically fetches and caches a short-lived proxy token, then injects it
 * as the `x-hypastack-proxy-key` header on every request.
 * On a 401, silently calls /api/v2/auth/refresh to rotate the access token,
 * then retries the original request once.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/http/fetch"
 *   const res = await apiFetch("/api/v2/files", { method: "GET" })
 */

const PROXY_HEADER = "x-hypastack-proxy-key"
const TOKEN_TTL_MS = 50_000 // refresh 10s before the 60s server expiry

let _cachedToken: string | null = null
let _cachedAt = 0

// Prevent concurrent token fetches from triggering multiple /proxy-token calls
let _tokenPromise: Promise<string> | null = null

async function getProxyToken(): Promise<string> {
  const now = Date.now()
  if (_cachedToken && now - _cachedAt < TOKEN_TTL_MS) {
    return _cachedToken
  }

  if (_tokenPromise) return _tokenPromise

  _tokenPromise = (async () => {
    // Always use raw fetch here — never apiFetch (would cause infinite recursion)
    const res = await fetch("/api/v2/proxy-token", { credentials: "include" })
    if (!res.ok) throw new Error("[apiFetch] Failed to obtain proxy token")
    const { token } = await res.json()
    _cachedToken = token
    _cachedAt = Date.now()
    _tokenPromise = null
    return token
  })()

  return _tokenPromise
}

function invalidateProxyToken() {
  _cachedToken = null
  _cachedAt = 0
}

// Prevent concurrent refresh calls
let _refreshing = false
let _refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (_refreshing && _refreshPromise) return _refreshPromise

  _refreshing = true
  _refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v2/auth/refresh", {
        method: "POST",
        credentials: "include",
      })
      return res.ok
    } catch {
      return false
    } finally {
      _refreshing = false
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : (input as Request).url

  const isApiCall =
    url.startsWith("/api/") ||
    (typeof globalThis !== "undefined" &&
      typeof (globalThis as any).location !== "undefined" &&
      url.startsWith((globalThis as any).location.origin + "/api/"))

  if (!isApiCall) return fetch(input, init)

  const token = await getProxyToken()
  const headers = { ...(init.headers ?? {}), [PROXY_HEADER]: token }

  const res = await fetch(input, { ...init, headers })

  // Silently refresh and retry once on 401 (expired access token)
  if (res.status === 401) {
    invalidateProxyToken()
    const refreshed = await tryRefresh()
    if (refreshed) {
      const newToken = await getProxyToken()
      return fetch(input, { ...init, headers: { ...(init.headers ?? {}), [PROXY_HEADER]: newToken } })
    }
    // Refresh failed — the response is returned as-is; caller handles redirect to login
  }

  return res
}
