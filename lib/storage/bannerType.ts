// Map a stored profile image key (banner-<hash>.<ext> or <hash>.<ext>) back to
// its MIME type so presigned/served URLs render animated GIF and AVIF correctly.
export function imageContentTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "png":
      return "image/png"
    case "gif":
      return "image/gif"
    case "avif":
      return "image/avif"
    case "webp":
      return "image/webp"
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg"
  }
}
