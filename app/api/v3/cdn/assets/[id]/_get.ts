import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedCdnAsset } from "@/lib/http/v3/owned"
import { toV3CdnAsset } from "@/lib/http/v3/serialize"

export const GET = withApiKey<{ id: string }>(async ({ requestId, userId, params, rate }) => {
  const asset = await loadOwnedCdnAsset(params.id, userId)
  if (!asset) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

  return v3Ok(toV3CdnAsset(asset), requestId, rate)
}, { scope: "cdn.read", label: "cdn retrieve" })
