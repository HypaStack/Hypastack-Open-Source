import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/lib/http/apiError"
import { readAccounts } from "@/lib/security/accountsCookie"
import { activateStashedAccount } from "@/lib/security/accountSwitch"
import { validateCsrfToken } from "@/lib/security/security"
import { rejectIfBlacklisted } from "@/lib/security/ownerGate"
import { checkAccountSwitchRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { API_ERRORS } from "@/constants"

const SwitchSchema = z.object({
  userId: z.string().min(1),
  csrfToken: z.string().min(1, "CSRF Token not found"),
})

export async function POST(request: NextRequest) {
  try {
    const blacklisted = await rejectIfBlacklisted(request)
    if (blacklisted) return blacklisted

    const rateLimit = await checkAccountSwitchRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "rate limit exceeded")
    }

    const validation = SwitchSchema.safeParse(await request.json())
    if (!validation.success) {
      return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }
    const { userId, csrfToken } = validation.data

    if (!(await validateCsrfToken(csrfToken))) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid csrf token, try again.")
    }

    const stashed = (await readAccounts()).find((a) => a.userId === userId)
    if (!stashed) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Not signed in on that account")
    }

    const failure = await activateStashedAccount(request, stashed)
    if (failure) return failure

    return NextResponse.json({ success: true, userId })
  } catch (error) {
    console.error("[Auth] Switch error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to switch account")
  }
}
