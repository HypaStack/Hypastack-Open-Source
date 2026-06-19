import crypto from "crypto"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { getPool, ensureDatabase } from "@/lib/db"
import { cached } from "@/lib/cache"

const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required but not set")
const PROXY_SECRET = (process.env.PROXY_SECRET || JWT_SECRET) as string

export function generateProxyToken(fileId: string): string {
  const payload = JSON.stringify({ fileId, exp: Math.floor(Date.now() / 1000) + 300 })
  const signature = crypto.createHmac("sha256", PROXY_SECRET).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${signature}`
}

export function verifyProxyToken(token: string, fileId: string): boolean {
  try {
    const [payloadB64, signature] = token.split(".")
    if (!payloadB64 || !signature) return false
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
    if (payload.exp < Math.floor(Date.now() / 1000)) return false
    if (payload.fileId !== fileId) return false
    const expected = crypto.createHmac("sha256", PROXY_SECRET).update(JSON.stringify(payload)).digest("base64url")
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex")
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

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt] = storedHash.split(":")
  if (!salt) return false
  const { hash } = hashPassword(password, salt)
  
  const hashBuf = Buffer.from(hash)
  const storedBuf = Buffer.from(storedHash)
  if (hashBuf.length !== storedBuf.length) return false
  
  return crypto.timingSafeEqual(hashBuf, storedBuf)
}

export function generateAccessKey(userId?: string): string {
  const secret = crypto.randomBytes(32).toString("hex")
  if (userId) {
    const cleanId = userId.replace(/-/g, "")
    return `hpsk_${cleanId}_${secret}`
  }
  return `hpsk_${secret}`
}

export function generateToken(payload: { userId: string; sessionId: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 15 * 60  // 15 minutes
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
  })
}

export async function clearRefreshCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("refresh_token")
}

export async function setAuthCookie(token: string, maxAge?: number) {
  const cookieStore = await cookies()
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAge || 7 * 24 * 60 * 60,
    path: "/"
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
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

export function generateUserId(): string {
  return crypto.randomUUID()
}
