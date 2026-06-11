import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hashPassword } from "@/lib/auth"
import { createUser } from "@/lib/user-model"
import { checkRegisterRateLimit } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { getHashedIp } from "@/lib/ip"
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const RegisterSchema = z.object({
  userId: z.string().uuid(),
  accessKey: z.string().startsWith("hpsk_").min(40),
  nickname_encrypted: z.string()
    .min(10, "Ciphertext too short")
    .max(500, "Ciphertext too long")
    .regex(CIPHERTEXT_REGEX, "Invalid ciphertext format"),
  turnstileToken: z.string().optional().default(""),
  csrfToken: z.string().min(1, "CSRF token required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
        console.error(`[API Error] 400 Bad Request: ${validation.error.issues[0].message}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const { userId, accessKey, nickname_encrypted, turnstileToken, csrfToken } = validation.data

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"Invalid security token. Please refresh the page and try again."}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          console.error(`[API Error] 403 Forbidden: ${turnstileResult.error || "Security verification failed"}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }

    const rateLimit = await checkRegisterRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"Too many registration attempts. Please try again later."}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    const { hash: passwordHash } = hashPassword(accessKey)

    await createUser({
      id: userId,
      nickname_encrypted,
      password_hash: passwordHash,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[Auth] Registration error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to create account"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
