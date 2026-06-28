const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

// A solved token may legitimately back a single user action that fans out to a
// few backend calls (e.g. a multi-file upload makes one init call per file with
// the same token). We cache the verified result briefly so those calls succeed,
// but cap reuse so one solved challenge can't authorize an unbounded burst of
// requests within the window.
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
  } catch (error: any) {
    console.error('[Turnstile] Error:', error.message)
    return { success: false, error: 'Turnstile verification error' }
  }
}
