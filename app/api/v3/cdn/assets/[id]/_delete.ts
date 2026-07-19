import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedCdnAsset } from "@/lib/http/v3/owned"
import { deleteCdnAssetsByIds } from "@/lib/models/cdnModel"
import { deleteByKey } from "@/lib/storage/r2"

export const DELETE = withApiKey<{ id: string }>(async ({ requestId, userId, params, rate }) => {
  const asset = await loadOwnedCdnAsset(params.id, userId)
  if (!asset) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

  await deleteCdnAssetsByIds([asset.id], userId)
  try {
    await deleteByKey(asset.r2_key)
  } catch (err) {
    console.warn(`[v3] R2 delete failed for cdn ${asset.id}:`, (err as Error).message)
  }

  return v3Ok({ object: "cdn_asset", id: asset.id, deleted: true }, requestId, rate)
}, { scope: "cdn.delete", label: "cdn delete" })
