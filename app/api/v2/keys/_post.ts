import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { createApiKey, countActiveApiKeys } from "@/lib/models/apiKeyModel"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { parseScopes } from "@/lib/http/v3/scopes"
import { sanitizeFilename } from "@/lib/security/zeroTrust"
import { API_ERRORS } from "@/constants"

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json().catch(() => null)
  if (!body) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid request body")
  }

  const name = sanitizeFilename(String(body.name ?? "")).sanitized.trim()
  if (!name || name.length > 60) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Give the key a name (up to 60 characters).")
  }

  const scopes = parseScopes(body.scopes)
  if (!scopes) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Pick at least one valid permission for this key.")
  }

  const tier = await getUserTier(user.userId)
  const allowance = getTierLimits(tier).maxApiKeys

  // The same rule the API enforces on use, applied at creation so the UI and the
  // API can never disagree about how many keys an account may hold.
  if (allowance === 0) {
    return apiError(403, API_ERRORS.FORBIDDEN, "The API is available on paid plans only.")
  }

  const active = await countActiveApiKeys(user.userId)
  if (active >= allowance) {
    return apiError(403, API_ERRORS.FORBIDDEN, `Your plan allows ${allowance} key${allowance === 1 ? "" : "s"}. Revoke one first.`)
  }

  const { key, row } = await createApiKey(user.userId, name, scopes)

  // The only time the plaintext key ever leaves the server.
  return NextResponse.json({
    key,
    id: row.id,
    name: row.name,
    hint: row.hint,
    scopes: row.scopes,
    createdAt: row.created_at,
  })
}, { rateLimit: true, label: "Keys POST" })
