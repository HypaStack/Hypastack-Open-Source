import { withAuth } from "@/lib/http/route"
import { revokeOtherUserSessions } from "@/lib/models/userModel"
import { NextResponse } from "next/server"

// Revoke every other session for this account, keeping the caller signed in.
// Other devices drop within ~60s (the revoked-session check) or on their next
// token refresh, whichever comes first.
export const POST = withAuth(async ({ user: auth }) => {
  const revoked = await revokeOtherUserSessions(auth.userId, auth.sessionId)
  return NextResponse.json({ success: true, revoked })
}, { rateLimit: true, label: "Clear Sessions" })
