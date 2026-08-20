import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/lib/http/apiError"
import { isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"
import { checkAppealRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { API_ERRORS, MAX_APPEAL_LENGTH } from "@/constants"

const AppealSchema = z.object({
  userId: z.string().trim().min(1, "Account id is required").max(64),
  message: z.string().trim().min(1, "Tell us what happened").max(MAX_APPEAL_LENGTH),
  turnstileToken: z.string().optional().default(""),
})

// Deliberately not behind rejectIfBlacklisted or withAuth: the people who need
// this page are exactly the ones who can't sign in and whose IP is blocked.
// Turnstile and a per-IP cap carry the abuse protection instead.
export async function POST(request: NextRequest) {
  try {
    const validation = AppealSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) {
      return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }
    const { userId, message, turnstileToken } = validation.data

    if (process.env.NODE_ENV !== "development") {
      const turnstile = await verifyTurnstileToken(turnstileToken)
      if (!turnstile.success) {
        return apiError(403, API_ERRORS.FORBIDDEN, turnstile.error || "Security Verification failed")
      }
    }

    // Same HMAC the blacklist stores, so the hash below matches a row in the
    // admin panel and the block can actually be found and lifted.
    const hashedIp = getHashedIp(request)

    const rateLimit = await checkAppealRateLimit(hashedIp)
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "rate limit exceeded")
    }

    const webhookUrl = process.env.DISCORD_APPEAL_WEBHOOK || ""
    if (!isValidDiscordWebhook(webhookUrl)) {
      console.error("[Appeal] DISCORD_APPEAL_WEBHOOK is missing or malformed")
      return apiError(503, API_ERRORS.INTERNAL_SERVER_ERROR, "Appeals aren't available right now")
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**Appeal**\nAccount: \`${userId}\`\nIP hash: \`${hashedIp}\`\n>>> ${message}`,
          allowed_mentions: { parse: [] },
        }),
        redirect: "error",
      })
      if (!res.ok) {
        console.error("[Appeal] Discord rejected the webhook:", res.status)
        return apiError(502, API_ERRORS.INTERNAL_SERVER_ERROR, "Couldn't submit your appeal, try again")
      }
    } catch (error) {
      console.error("[Appeal] Webhook request failed:", error)
      return apiError(502, API_ERRORS.INTERNAL_SERVER_ERROR, "Couldn't submit your appeal, try again")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Appeal] error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Couldn't submit your appeal")
  }
}
