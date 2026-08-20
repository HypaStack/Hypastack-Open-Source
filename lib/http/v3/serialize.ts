import { decryptFilename } from "@/lib/security/filenameCrypto"
import type { FileRecord } from "@/lib/models/fileModel"
import type { CdnAsset } from "@/lib/models/cdnModel"

// snake_case, ISO 8601 UTC timestamps, one convention across the whole API.
// Internal columns (r2_key etc) are deliberately absent, r2_key mints presigned URLs.
export interface V3File {
  object: "file"
  id: string
  name: string
  size: number
  content_type: string
  created_at: string
  expires_at: string
  burn_on_read: boolean
}

export interface V3CdnAsset {
  object: "cdn_asset"
  id: string
  name: string
  size: number
  content_type: string
  created_at: string
  url: string
}

function iso(value: Date | string): string {
  return new Date(value).toISOString()
}

// No url field: API-created files have no #fragment key, so a /d/ link would never work.
// Use GET /files/{id}/download for a signed URL instead.
export function toV3File(record: FileRecord): V3File {
  return {
    object: "file",
    id: record.id,
    // Filenames are encrypted at rest with a server-held key; the API returns
    // them in the clear, same as the dashboard does.
    name: decryptFilename(record.custom_filename || record.original_name),
    size: record.file_size,
    content_type: record.content_type,
    created_at: iso(record.upload_date),
    expires_at: iso(record.expires_at),
    burn_on_read: (record.burn_on_read ?? 0) !== 0,
  }
}

export function toV3CdnAsset(asset: CdnAsset): V3CdnAsset {
  return {
    object: "cdn_asset",
    id: asset.id,
    // Not decrypted: CDN names are stored as sanitized plaintext, unlike Storage
    // filenames. decryptFilename would pass them through untouched, but only by
    // way of its can't-decrypt fallback, relying on that would be an accident.
    name: asset.original_name,
    size: asset.file_size,
    content_type: asset.content_type,
    created_at: iso(asset.created_at),
    url: asset.cdn_url,
  }
}
