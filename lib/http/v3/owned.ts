import { getFileById, type FileRecord } from "@/lib/models/fileModel"
import { getCdnAssetById, type CdnAsset } from "@/lib/models/cdnModel"

/**
 * Load a resource only if the calling key's account owns it.
 *
 * Both "no such row" and "someone else's row" collapse to `null` here, in one
 * place, so every caller can only produce the identical `404 not_found`. This is
 * the enumeration guard: if a missing file 404'd and another account's file
 * 403'd, any key holder could walk the id space and confirm which ids are real.
 *
 * The ownership comparison happens after the same query in both cases, so the
 * two outcomes also cost the same work.
 */
export async function loadOwnedFile(id: string, userId: string): Promise<FileRecord | null> {
  const file = await getFileById(id)
  if (!file || file.user_id !== userId) return null
  return file
}

export async function loadOwnedCdnAsset(id: string, userId: string): Promise<CdnAsset | null> {
  const asset = await getCdnAssetById(id)
  if (!asset || asset.user_id !== userId) return null
  return asset
}
