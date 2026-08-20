import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listUsersAdmin } from "@/lib/models/userModel"
import { serializeAdminUser } from "../_serialize"

export const GET = withAuth(async ({ request }) => {
  const search = request.nextUrl.searchParams.get("q") || undefined
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0

  const users = await listUsersAdmin({ search, offset, limit: 25 })

  return NextResponse.json({ users: users.map(serializeAdminUser) })
}, { ownerOnly: true, label: "Admin Users GET" })
