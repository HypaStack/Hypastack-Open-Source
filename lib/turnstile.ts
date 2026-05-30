// Cloudflare Turnstile verification
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

export async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  if (!TURNSTILE_SECRET_KEY) {
    console.error('[Turnstile] Secret key not configured')
    return { success: false, error: 'Turnstile not configured' }
  }

  if (!token) {
    return { success: false, error: 'Missing Turnstile token' }
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

    return { success: true }
  } catch (error: any) {
    console.error('[Turnstile] Error:', error.message)
    return { success: false, error: 'Turnstile verification error' }
  }
}
