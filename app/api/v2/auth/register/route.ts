import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hashPassword } from "@/lib/auth"
import { createUser } from "@/lib/user-model"
import { checkRegisterRateLimit } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"

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
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId, accessKey, nickname_encrypted, turnstileToken, csrfToken } = validation.data

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 }
      )
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || "Security verification failed" },
          { status: 403 }
        )
      }
    }

    const rateLimit = await checkRegisterRateLimit(userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      )
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
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
