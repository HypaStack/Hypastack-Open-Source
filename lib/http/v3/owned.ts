import { getFileById, type FileRecord } from "@/lib/models/fileModel"
import { getCdnAssetById, type CdnAsset } from "@/lib/models/cdnModel"

// "No such row" and "someone else's row" both collapse to null, so callers only
// ever produce the same 404 not_found. Enumeration guard: a 404-vs-403 split
// would let a key holder walk the id space and confirm which ids are real.
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
