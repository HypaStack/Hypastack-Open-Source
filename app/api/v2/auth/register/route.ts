import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hashPassword } from "@/lib/auth"
import { createUser } from "@/lib/user-model"
import { checkRegisterRateLimit } from "@/lib/rate-limit"

/**
 * Zero-Knowledge Registration (E2E Encrypted)
 *
 * 1. Client generates userId and cryptographically secure access key (hpsk_...)
 * 2. Client derives an AES-256-GCM master key from the access key
 * 3. Client encrypts the chosen nickname with the master key
 * 4. Server receives encrypted nickname + raw access key
 * 5. Server hashes the access key (PBKDF2) and stores it with the encrypted nickname
 */

// Strict ciphertext format: base64(iv):base64(ciphertext)
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const RegisterSchema = z.object({
  userId: z.string().uuid(),
  accessKey: z.string().startsWith("hpsk_").min(40),
  nickname_encrypted: z.string()
    .min(10, "Ciphertext too short")
    .max(500, "Ciphertext too long")
    .regex(CIPHERTEXT_REGEX, "Invalid ciphertext format"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId, accessKey, nickname_encrypted } = validation.data


    // Hash the access key for storage (PBKDF2 — can't reverse)
    const { hash: passwordHash } = hashPassword(accessKey)

    // Create user with encrypted nickname
    await createUser({
      id: userId,
      nickname_encrypted,
      password_hash: passwordHash,
    })

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error("[Auth] Registration error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
