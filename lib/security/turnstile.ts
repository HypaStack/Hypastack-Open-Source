import { errorMessage } from "@/lib/errors"
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

// A multi-file upload reuses one solved token across several init calls, so we
// cache the verified result briefly, but cap reuse to bound abuse per token.
const TOKEN_TTL_MS = 60000
const MAX_TOKEN_REUSES = 50
const verifiedTokens = new Map<string, { at: number; uses: number }>()

export async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  if (!TURNSTILE_SECRET_KEY) {
    console.error('[Turnstile] Secret key not configured')
    return { success: false, error: 'Turnstile not configured' }
  }

  if (!token) {
    return { success: false, error: 'Missing Turnstile token' }
  }

  const now = Date.now()
  const cached = verifiedTokens.get(token)
  if (cached) {
    if (now - cached.at < TOKEN_TTL_MS) {
      if (cached.uses >= MAX_TOKEN_REUSES) {
        return { success: false, error: 'Security token exhausted, please retry' }
      }
      cached.uses++
      return { success: true }
    }
    verifiedTokens.delete(token)
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    const data = await response.json()

    if (!data.success) {
      console.error('[Turnstile] Verification failed:', data)
      return { success: false, error: 'Turnstile verification failed' }
    }

    verifiedTokens.set(token, { at: now, uses: 1 })
    for (const [k, v] of verifiedTokens.entries()) {
      if (now - v.at > TOKEN_TTL_MS) {
        verifiedTokens.delete(k)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Turnstile] Error:', errorMessage(error))
    return { success: false, error: 'Turnstile verification error' }
  }
}
