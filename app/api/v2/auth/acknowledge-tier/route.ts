import { withAuth } from "@/lib/route"
import { acknowledgeUserTier } from "@/lib/user-model"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

// marks as acknowledged
export const POST = withAuth(async ({ user }) => {
    await acknowledgeUserTier(user.userId)
    return NextResponse.json({ success: true })
}, { label: "Acknowledge Tier" })
