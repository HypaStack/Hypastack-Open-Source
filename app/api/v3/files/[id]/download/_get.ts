import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedFile } from "@/lib/http/v3/owned"
import { getPresignedDownloadUrl } from "@/lib/storage/r2"
import { decryptFilename } from "@/lib/security/filenameCrypto"

const URL_TTL_S = 300

export const GET = withApiKey<{ id: string }>(async ({ requestId, userId, params, rate }) => {
  const file = await loadOwnedFile(params.id, userId)
  if (!file) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

  if (!file.upload_completed) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: "That upload has not been completed yet.",
      rate,
    })
  }

  // Returned as JSON rather than a 302 so a client that follows redirects by
  // default doesn't stream a multi-gigabyte body it never asked for.
  //
  // This does NOT consume a burn-on-read file: the API is the owner managing
  // their own storage, whereas burning is a property of the public /d/ share
  // link being opened by a recipient.
  const downloadUrl = await getPresignedDownloadUrl({
    r2Key: file.r2_key,
    originalName: decryptFilename(file.custom_filename || file.original_name),
    contentType: file.content_type,
    expiresIn: URL_TTL_S,
  })

  return v3Ok(
    {
      object: "download",
      id: file.id,
      download_url: downloadUrl,
      expires_at: new Date(Date.now() + URL_TTL_S * 1000).toISOString(),
    },
    requestId,
    rate,
  )
}, { scope: "files.read", label: "files download" })
