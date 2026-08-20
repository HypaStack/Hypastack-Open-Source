import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listInviteCodes } from "@/lib/models/inviteModel"
import { serializeInviteCode } from "../_serialize"

export const GET = withAuth(async ({ request }) => {
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0
  const codes = await listInviteCodes({ offset })

  return NextResponse.json({ codes: codes.map(serializeInviteCode) })
}, { ownerOnly: true, label: "Admin Invite Codes GET" })
