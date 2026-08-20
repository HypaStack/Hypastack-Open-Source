import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"
import { checkFeedbackRateLimit } from "@/lib/data/rateLimit"
import { getUserById } from "@/lib/models/userModel"
import { API_ERRORS, MAX_FEEDBACK_LENGTH } from "@/constants"

const FeedbackSchema = z.object({
  message: z.string().trim().min(1, "Feedback can't be empty").max(MAX_FEEDBACK_LENGTH),
  linkAccount: z.boolean(),
})

export const POST = withAuth(async ({ request, user }) => {
  const validation = FeedbackSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
  }
  const { message, linkAccount } = validation.data

  // paid plans get a bigger allowance, see MAX_ATTEMPTS.feedback
  const account = await getUserById(user.userId)
  const rateLimit = await checkFeedbackRateLimit(user.userId, account?.tier ?? "free")
  if (!rateLimit.allowed) {
    return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "rate limit exceeded")
  }

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK || ""
  if (!isValidDiscordWebhook(webhookUrl)) {
    console.error("[Feedback] DISCORD_FEEDBACK_WEBHOOK is missing or malformed")
    return apiError(503, API_ERRORS.INTERNAL_SERVER_ERROR, "Feedback isn't available right now")
  }

  // The id comes off the session, never off the request body, so nobody can
  // file feedback as somebody else.
  const header = linkAccount ? `**Feedback** from \`${user.userId}\`` : "**Feedback** (anonymous)"

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // parse: [] means an @everyone typed into the box stays plain text
      body: JSON.stringify({
        content: `${header}\n>>> ${message}`,
        allowed_mentions: { parse: [] },
      }),
      redirect: "error",
    })
    if (!res.ok) {
      console.error("[Feedback] Discord rejected the webhook:", res.status)
      return apiError(502, API_ERRORS.INTERNAL_SERVER_ERROR, "Couldn't deliver your feedback, try again")
    }
  } catch (error) {
    console.error("[Feedback] Webhook request failed:", error)
    return apiError(502, API_ERRORS.INTERNAL_SERVER_ERROR, "Couldn't deliver your feedback, try again")
  }

  return NextResponse.json({ success: true })
}, { label: "Feedback POST" })
