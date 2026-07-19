import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { revokeApiKey } from "@/lib/models/apiKeyModel"
import { API_ERRORS } from "@/constants"

export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
  // Scoped to the owner inside the model, so one account can never revoke
  // another's key even with a guessed id.
  const revoked = await revokeApiKey(user.userId, params.id)
  if (!revoked) {
    return apiError(404, API_ERRORS.NOT_FOUND, "That key does not exist.")
  }

  return NextResponse.json({ id: params.id, revoked: true })
}, { rateLimit: true, label: "Keys DELETE" })
