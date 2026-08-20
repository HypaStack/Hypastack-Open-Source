import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { revokeInviteCode } from "@/lib/models/inviteModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export const DELETE = withAuth<{ code: string }>(async ({ params }) => {
  const revoked = await revokeInviteCode(decodeURIComponent(params.code))
  if (!revoked) {
    return apiError(404, API_ERRORS.NOT_FOUND, "Code not found, or already used")
  }
  return NextResponse.json({ success: true })
}, { ownerOnly: true, label: "Admin Invite Code DELETE" })
