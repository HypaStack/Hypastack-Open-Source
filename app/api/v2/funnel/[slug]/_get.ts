import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getActiveFunnelBySlug } from "@/lib/models/funnelModel"
import { getUserById } from "@/lib/models/userModel"
import { getTierLimits, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { getPresignedDownloadUrl } from "@/lib/storage/r2"
import { imageContentTypeFromKey } from "@/lib/storage/bannerType"
import { isTokenProfileKey } from "@/lib/storage/profileKeys"
import { checkApiRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { API_ERRORS } from "@/constants"

// Public meta for the sender page: the funnel's public key (to encrypt with), the
// owner's per-upload size limit, and light owner branding. 404 once consumed.
export async function handleFunnelMeta(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params

    const rl = await checkApiRateLimit(getHashedIp(request))
    if (!rl.allowed) return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")

    const funnel = await getActiveFunnelBySlug(slug)
    if (!funnel) return apiError(404, API_ERRORS.NOT_FOUND, "This funnel link is closed or doesn't exist.")

    const owner = await getUserById(funnel.user_id)
    if (!owner) return apiError(404, API_ERRORS.NOT_FOUND, "This funnel link is closed or doesn't exist.")

    const tier = getTierLimits(normalizeTier(owner.tier))

    let avatarUrl: string | null = null
    if (isPaidTier(normalizeTier(owner.tier)) && isTokenProfileKey(owner.avatar_url, owner.storage_token)) {
      avatarUrl = await getPresignedDownloadUrl({
        r2Key: owner.avatar_url!,
        originalName: "avatar",
        contentType: imageContentTypeFromKey(owner.avatar_url!),
        disposition: "inline",
        expiresIn: 3600,
      })
    }

    return NextResponse.json({
      publicKey: funnel.public_key,
      maxUploadSize: tier.maxFunnelUploadSize,
      owner: { displayName: owner.display_name, avatarUrl, verified: owner.verified },
    })
  } catch (error) {
    console.error("[Funnel Meta] error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Internal Server Error")
  }
}
