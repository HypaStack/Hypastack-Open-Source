import crypto from "crypto"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { getPool, ensureDatabase } from "@/lib/data/db"
import { cached } from "@/lib/data/cache"
import { deriveViaService } from "@/lib/security/hashService"

const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required but not set")
const PROXY_SECRET = (process.env.PROXY_SECRET || JWT_SECRET) as string
// Set when the API is served from a separate host (e.g. ".hypastack.com") so the
// auth cookies are shared across the app and api. subdomains. Unset = host-only.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined

export function generateProxyToken(fileId: string): string {
  const payload = JSON.stringify({ fileId, exp: Math.floor(Date.now() / 1000) + 300 })
  const signature = crypto.createHmac("sha256", PROXY_SECRET).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${signature}`
}

export function verifyProxyToken(token: string, fileId: string): boolean {
  try {
    const [payloadB64, signature] = token.split(".")
    if (!payloadB64 || !signature) return false
    // Verify the HMAC over the exact bytes that were signed (the decoded
    // payload string) rather than a re-serialized object. Re-serializing via
    // JSON.stringify(JSON.parse(...)) relies on engine-specific key ordering
    // and would silently break or diverge if the payload shape ever changes.
    const rawPayload = Buffer.from(payloadB64, "base64url").toString()
    const expected = crypto.createHmac("sha256", PROXY_SECRET).update(rawPayload).digest("base64url")
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false
    const payload = JSON.parse(rawPayload)
    if (payload.exp < Math.floor(Date.now() / 1000)) return false
    if (payload.fileId !== fileId) return false
    return true
  } catch {
    return false
  }
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex")
}

// Deterministic, indexable lookup value for a credential: login access keys
// (~190 bits) and v3 API keys (256 bits). Both are CSPRNG-generated, never
// user-chosen, so a plain SHA-256 is the right call — a slow KDF only buys time
// against a guessable input, and there's nothing to guess at this entropy. It
// also runs on every v3 request, where PBKDF2 would be a self-inflicted DoS.
// CodeQL's js/insufficient-password-hash flags this because it reads any
// credential as a password. Don't "fix" it by swapping in a KDF.
export function computeKeyLookup(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || generateSalt()
  const hash = crypto
    .pbkdf2Sync(password, useSalt, 100000, 64, "sha512")
    .toString("hex")

  return {
    salt: useSalt,
    hash: `${useSalt}:${hash}`
  }
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt] = storedHash.split(":")
  if (!salt) return false
  const { hash } = hashPassword(password, salt)

  const hashBuf = Buffer.from(hash)
  const storedBuf = Buffer.from(storedHash)
  if (hashBuf.length !== storedBuf.length) return false

  return crypto.timingSafeEqual(hashBuf, storedBuf)
}

// Async variants that offload PBKDF2 to the Go sidecar and fall back to the
// synchronous in-process implementation above if it's unreachable. Same hash
// format either way, so results are interchangeable.

export async function hashPasswordAsync(
  password: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  try {
    return await deriveViaService(password, salt)
  } catch {
    return hashPassword(password, salt)
  }
}

export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  const [salt] = storedHash.split(":")
  if (!salt) return false

  let computed: string
  try {
    computed = (await deriveViaService(password, salt)).hash
  } catch {
    return verifyPassword(password, storedHash)
  }

  const hashBuf = Buffer.from(computed)
  const storedBuf = Buffer.from(storedHash)
  if (hashBuf.length !== storedBuf.length) return false

  return crypto.timingSafeEqual(hashBuf, storedBuf)
}

export function generateToken(payload: { userId: string; sessionId: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 60 * 60  // 1 hour
  })).toString("base64url")

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url")

  return `${header}.${body}.${signature}`
}

export function verifyToken(token: string): { userId: string; sessionId: string } | null {
  try {
    const [header, body, signature] = token.split(".")
    if (!header || !body || !signature) return null

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url")

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) return null

    const payload = JSON.parse(Buffer.from(body, "base64url").toString())
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return { userId: payload.userId, sessionId: payload.sessionId }
  } catch {
    return null
  }
}

// --- Refresh token (opaque, stored in DB) ---

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex")
}

export async function setRefreshCookie(refreshToken: string) {
  const cookieStore = await cookies()
  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })
}

export async function clearRefreshCookie() {
  const cookieStore = await cookies()
  cookieStore.delete({ name: "refresh_token", path: "/", ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}) })
}

export async function setAuthCookie(token: string, maxAge?: number) {
  const cookieStore = await cookies()
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAge || 7 * 24 * 60 * 60,
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete({ name: "auth_token", path: "/", ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}) })
}

export async function getCurrentUser(request: NextRequest): Promise<{ userId: string; sessionId: string } | null> {
  const token = request.cookies.get("auth_token")?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null

  // #4: Verify the session is still active in the DB (catches revoked/stolen tokens)
  try {
    const isRevoked = await cached(`session:${payload.sessionId}:revoked`, 60, async () => {
      await ensureDatabase()
      const pool = getPool()
      const result = await pool.query<{ revoked: boolean }>(
        `SELECT revoked FROM user_sessions WHERE id = $1 AND user_id = $2`,
        [payload.sessionId, payload.userId]
      )
      return result.rows.length === 0 || result.rows[0].revoked
    })
    
    if (isRevoked) return null
  } catch {
    // Fail closed: If DB is unreachable, we must assume the session might be revoked
    // to prevent stolen/revoked tokens from bypassing security during an outage.
    return null
  }

  return payload
}
