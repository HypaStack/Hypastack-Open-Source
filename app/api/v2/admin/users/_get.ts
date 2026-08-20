import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listUsersAdmin } from "@/lib/models/userModel"

export const GET = withAuth(async ({ request }) => {
  const search = request.nextUrl.searchParams.get("q") || undefined
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0

  const users = await listUsersAdmin({ search, offset, limit: 25 })

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      tier: u.tier,
      suspended: u.suspended,
      isOwner: u.is_owner,
      storageUsed: u.storage_used,
      createdAt: u.created_at,
      lastLogin: u.last_login,
    })),
  })
}, { ownerOnly: true, label: "Admin Users GET" })
