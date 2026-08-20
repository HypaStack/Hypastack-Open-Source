import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { createInviteCodes } from "@/lib/models/inviteModel"
import { API_ERRORS } from "@/constants"

export const POST = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  const count = Number(body.count) || 1

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Count must be between 1 and 100.")
  }

  const codes = await createInviteCodes(count)
  return NextResponse.json({ codes })
}, { ownerOnly: true, label: "Admin Invite Codes POST" })
