import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listInviteCodes } from "@/lib/models/inviteModel"

export const GET = withAuth(async ({ request }) => {
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0
  const codes = await listInviteCodes({ offset })

  return NextResponse.json({
    codes: codes.map((c) => ({
      code: c.code,
      maxUses: c.max_uses,
      usesCount: c.uses_count,
      redeemedBy: c.redeemed_by,
      createdAt: c.created_at,
    })),
  })
}, { ownerOnly: true, label: "Admin Invite Codes GET" })
