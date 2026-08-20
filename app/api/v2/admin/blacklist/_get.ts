import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listBlacklistedIps } from "@/lib/models/blacklistModel"
import { serializeBlacklistEntry } from "../_serialize"

export const GET = withAuth(async () => {
  const entries = await listBlacklistedIps()
  return NextResponse.json({ entries: entries.map(serializeBlacklistEntry) })
}, { ownerOnly: true, label: "Admin Blacklist GET" })
