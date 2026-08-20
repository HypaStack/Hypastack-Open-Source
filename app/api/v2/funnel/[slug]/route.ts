import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { deleteActiveRequestBySlug } from "@/lib/models/requestModel"
import { API_ERRORS } from "@/constants"
import { handleRequestMeta } from "./_get"

export const dynamic = "force-dynamic"

// Public sender-page metadata.
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return handleRequestMeta(request, context)
}

// Owner deletes an unused drop link.
export const DELETE = withAuth<{ slug: string }>(async ({ user, params }) => {
  const ok = await deleteActiveRequestBySlug(params.slug, user.userId)
  if (!ok) return apiError(404, API_ERRORS.NOT_FOUND, "Request not found")
  return NextResponse.json({ success: true })
}, { label: "Request DELETE" })
