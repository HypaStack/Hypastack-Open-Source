import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { listApiKeys } from "@/lib/models/apiKeyModel"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"

export const GET = withAuth(async ({ user }) => {
  const [keys, tier] = await Promise.all([
    listApiKeys(user.userId),
    getUserTier(user.userId),
  ])
  const allowance = getTierLimits(tier).maxApiKeys

  return NextResponse.json({
    allowance,
    // Oldest first, matching the rank rule the API enforces: after a downgrade
    // the keys past the allowance stop working, and the UI greys exactly those.
    keys: keys.map((k, index) => ({
      id: k.id,
      name: k.name,
      hint: k.hint,
      scopes: k.scopes,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
      overLimit: index >= allowance,
    })),
  })
}, { rateLimit: true, label: "Keys GET" })
