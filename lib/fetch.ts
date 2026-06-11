/**
 * lib/fetch.ts
 *
 * Drop-in replacement for `fetch()` on the client side.
 * Automatically fetches and caches a short-lived proxy token, then injects it
 * as the `x-hypastack-proxy-key` header on every request.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/fetch"
 *   const res = await apiFetch("/api/v2/files", { method: "GET" })
 */

const PROXY_HEADER = "x-hypastack-proxy-key"
const TOKEN_TTL_MS = 50_000 // refresh 10s before the 60s server expiry

let _cachedToken: string | null = null
let _cachedAt = 0

async function getProxyToken(): Promise<string> {
  const now = Date.now()
  if (_cachedToken && now - _cachedAt < TOKEN_TTL_MS) {
    return _cachedToken
  }

  const res = await apiFetch("/api/v2/proxy-token", { credentials: "include" })
  if (!res.ok) throw new Error("[apiFetch] Failed to obtain proxy token")
  const { token } = await res.json()
  _cachedToken = token
  _cachedAt = now
  return token
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  // Only inject for same-origin /api/* calls — skip absolute external URLs
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const isApiCall = url.startsWith("/api/") || url.startsWith(globalThis?.location?.origin + "/api/")

  if (isApiCall) {
    const token = await getProxyToken()
    init = {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        [PROXY_HEADER]: token,
      },
    }
  }

  return fetch(input, init)
}
