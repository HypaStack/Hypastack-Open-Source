import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { setUserTierAdmin, setUserSuspended } from "@/lib/models/userModel"
import { API_ERRORS } from "@/constants"

const PatchSchema = z.object({
  tier: z.enum(["free", "essential", "premium", "ultimate"]).optional(),
  suspended: z.boolean().optional(),
})

export const PATCH = withAuth<{ id: string }>(async ({ request, user, params }) => {
  const body = await request.json().catch(() => null)
  const validation = PatchSchema.safeParse(body)
  if (!validation.success) {
    return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
  }
  const { tier, suspended } = validation.data

  // Can't suspend the account you're using to run this panel, that's how you
  // lock yourself out.
  if (suspended && params.id === user.userId) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "You can't suspend your own account.")
  }

  if (tier) await setUserTierAdmin(params.id, tier)
  if (suspended !== undefined) await setUserSuspended(params.id, suspended)

  return NextResponse.json({ success: true })
}, { ownerOnly: true, label: "Admin User PATCH" })
