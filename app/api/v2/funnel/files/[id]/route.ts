import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { deleteByKey } from "@/lib/storage/r2"
import { deleteFunnelFile } from "@/lib/models/funnelModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
  const r2Key = await deleteFunnelFile(params.id, user.userId)
  if (!r2Key) return apiError(404, API_ERRORS.NOT_FOUND, "File not found")
  await deleteByKey(r2Key).catch(() => {})
  return NextResponse.json({ success: true })
}, { label: "Funnel File DELETE" })
