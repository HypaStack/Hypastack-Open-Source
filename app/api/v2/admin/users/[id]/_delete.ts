import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { deleteUserAccountAdmin } from "@/lib/models/userModel"
import { API_ERRORS } from "@/constants"

export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
  if (params.id === user.userId) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "You can't delete your own account from here.")
  }

  const deleted = await deleteUserAccountAdmin(params.id)
  if (!deleted) {
    return apiError(404, API_ERRORS.NOT_FOUND, "Account not found")
  }
  return NextResponse.json({ success: true })
}, { ownerOnly: true, label: "Admin User DELETE" })
