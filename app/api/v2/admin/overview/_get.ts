import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listInviteCodes } from "@/lib/models/inviteModel"
import { listUsersAdmin } from "@/lib/models/userModel"
import { listBlacklistedIps } from "@/lib/models/blacklistModel"
import { serializeInviteCode, serializeAdminUser, serializeBlacklistEntry } from "../_serialize"

// everything the admin page needs in one round trip, so switching tabs costs nothing
export const GET = withAuth(async () => {
  const [codes, users, blacklist] = await Promise.all([
    listInviteCodes({ offset: 0 }),
    listUsersAdmin({ offset: 0, limit: 25 }),
    listBlacklistedIps(),
  ])

  return NextResponse.json({
    codes: codes.map(serializeInviteCode),
    users: users.map(serializeAdminUser),
    blacklist: blacklist.map(serializeBlacklistEntry),
  })
}, { ownerOnly: true, label: "Admin Overview GET" })
