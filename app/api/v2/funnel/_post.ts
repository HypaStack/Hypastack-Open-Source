import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { validateCsrfToken } from "@/lib/security/security"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { validateSlug } from "@/lib/validation/slug"
import {
  generateFunnelId,
  createFunnelWithCap,
  isFunnelSlugTaken,
  suggestAvailableFunnelSlugs,
} from "@/lib/models/funnelModel"
import { API_ERRORS } from "@/constants"
import { errorCode } from "@/lib/errors"

// The keypair is generated in the owner's browser; we only ever receive the
// public key and the already-wrapped private key. Cap their sizes so a client
// can't stash arbitrary blobs (a 2048-bit SPKI/PKCS8 is well under these).
const MAX_PUBLIC_KEY = 1000
const MAX_WRAPPED_KEY = 4000

export async function handleFunnelCreate({
  request,
  user,
}: {
  request: NextRequest
  user: { userId: string }
}): Promise<Response> {
  const body = await request.json()
  const { csrfToken, publicKey, wrappedPrivateKey, customSlug } = body

  if (!csrfToken || !(await validateCsrfToken(csrfToken))) {
    return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF Token")
  }

  if (typeof publicKey !== "string" || !publicKey || publicKey.length > MAX_PUBLIC_KEY) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Missing or invalid public key")
  }
  if (typeof wrappedPrivateKey !== "string" || !wrappedPrivateKey.includes(":") || wrappedPrivateKey.length > MAX_WRAPPED_KEY) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Missing or invalid wrapped key")
  }

  const userTier = normalizeTier(await getUserTier(user.userId))
  if (!isPaidTier(userTier)) {
    return apiError(403, API_ERRORS.FORBIDDEN, "Funnels are available on the Essential plan and above.")
  }

  const tier = getTierLimits(userTier)
  const id = generateFunnelId()

  // Custom slug (paid plans). Otherwise the random 12-char id doubles as the slug
  // (it already satisfies the slug charset and min length).
  let slug = id
  if (customSlug != null && String(customSlug).trim() !== "") {
    const slugCheck = validateSlug(String(customSlug))
    if (!slugCheck.ok) {
      return apiError(400, API_ERRORS.BAD_REQUEST, slugCheck.error || "Invalid custom link")
    }
    if (await isFunnelSlugTaken(slugCheck.slug)) {
      const suggestions = await suggestAvailableFunnelSlugs(slugCheck.slug)
      return apiError(409, API_ERRORS.CONFLICT, "Custom link already taken", { slug: slugCheck.slug, suggestions })
    }
    slug = slugCheck.slug
  }

  try {
    // Atomic cap enforcement — no TOCTOU across concurrent creates.
    const result = await createFunnelWithCap(
      { id, slug, user_id: user.userId, public_key: publicKey, private_key_wrapped: wrappedPrivateKey },
      tier.maxFunnelLinks,
    )
    if (result === "cap") {
      return apiError(403, API_ERRORS.FORBIDDEN, "You've reached your active funnel link limit.")
    }
  } catch (e) {
    // Lost a slug race.
    if (errorCode(e) === "23505") {
      const suggestions = await suggestAvailableFunnelSlugs(slug)
      return apiError(409, API_ERRORS.CONFLICT, "Custom link already taken", { slug, suggestions })
    }
    throw e
  }

  return NextResponse.json({ success: true, id, slug })
}
