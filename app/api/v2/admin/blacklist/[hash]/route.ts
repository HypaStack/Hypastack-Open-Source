import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { removeIpFromBlacklist } from "@/lib/models/blacklistModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export const DELETE = withAuth<{ hash: string }>(async ({ params }) => {
  const removed = await removeIpFromBlacklist(decodeURIComponent(params.hash))
  if (!removed) {
    return apiError(404, API_ERRORS.NOT_FOUND, "That IP isn't blacklisted")
  }
  return NextResponse.json({ success: true })
}, { ownerOnly: true, label: "Admin Blacklist DELETE" })
