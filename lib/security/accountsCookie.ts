import { cookies } from "next/headers"
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@/constants"

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const COOKIE_NAME = "hpsk_accounts"

// Enough for a handful of accounts without pushing the request headers around.
// Each entry is ~140 bytes.
const MAX_ACCOUNTS = 5

export interface StashedAccount {
  userId: string
  refreshToken: string
}

// The refresh token is httpOnly for a reason, so the roster of signed-in
// accounts lives in a cookie the browser can't read either. Holding this cookie
// is exactly as powerful as holding a refresh token, no more.
export async function readAccounts(): Promise<StashedAccount[]> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value
  if (!raw) return []
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString())
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is StashedAccount =>
        typeof a?.userId === "string" && typeof a?.refreshToken === "string"
    )
  } catch {
    return []
  }
}

export async function writeAccounts(list: StashedAccount[]): Promise<void> {
  const cookieStore = await cookies()
  if (list.length === 0) {
    cookieStore.delete({ name: COOKIE_NAME, path: "/", ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}) })
    return
  }
  const value = Buffer.from(JSON.stringify(list.slice(0, MAX_ACCOUNTS))).toString("base64url")
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })
}

/** Most recent login goes first, and a second login on the same account replaces its token. */
export async function rememberAccount(userId: string, refreshToken: string): Promise<void> {
  const rest = (await readAccounts()).filter((a) => a.userId !== userId)
  await writeAccounts([{ userId, refreshToken }, ...rest])
}

export async function forgetAccount(userId: string): Promise<void> {
  await writeAccounts((await readAccounts()).filter((a) => a.userId !== userId))
}
