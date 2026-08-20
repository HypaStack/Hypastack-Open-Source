import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listBlacklistedIps } from "@/lib/models/blacklistModel"

export const GET = withAuth(async () => {
  const entries = await listBlacklistedIps()
  return NextResponse.json({
    entries: entries.map((e) => ({
      ipHash: e.ip_hash,
      reason: e.reason,
      createdAt: e.created_at,
    })),
  })
}, { ownerOnly: true, label: "Admin Blacklist GET" })
