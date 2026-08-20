import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { createInviteCodes, createCustomInviteCode } from "@/lib/models/inviteModel"
import { API_ERRORS } from "@/constants"

const CODE_REGEX = /^[A-Za-z0-9_-]{3,64}$/

export const POST = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  const maxUses = Number(body.maxUses) || 1
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Max uses must be between 1 and 100000.")
  }

  // A hand-picked code, one at a time.
  if (typeof body.code === "string" && body.code.trim()) {
    const code = body.code.trim()
    if (!CODE_REGEX.test(code)) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Code must be 3-64 characters, letters, numbers, - or _.")
    }
    const created = await createCustomInviteCode(code, maxUses)
    if (!created) {
      return apiError(409, API_ERRORS.CONFLICT, "That code already exists.")
    }
    return NextResponse.json({ codes: [code] })
  }

  const count = Number(body.count) || 1
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Count must be between 1 and 100.")
  }

  const codes = await createInviteCodes(count, maxUses)
  return NextResponse.json({ codes })
}, { ownerOnly: true, label: "Admin Invite Codes POST" })
