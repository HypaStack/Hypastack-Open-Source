/**
 * Security-related constants shared between API validation and client-side logic.
 */

/** Maximum allowed file size for standard uploads (500 MB) */
export const MAX_FILE_SIZE = 500 * 1024 * 1024

/**
 * CDN allowlist — embeddable/usable web content.
 * Extension allowlist is the ONLY gate for CDN uploads;
 * magic bytes only block dangerous types.
 */
export const CDN_ALLOWED_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "ico", "cur", "ani", "bmp", "tiff", "tif",
  "avif", "heic", "heif", "jxl", "apng", "dng",
  // Fonts
  "ttf", "otf", "woff", "woff2", "eot",
  // Audio
  "mp3", "wav", "ogg", "oga", "flac", "aac", "m4a", "opus",
  "mid", "midi", "weba",
  // Video
  "mp4", "m4v", "webm", "mov", "avi", "mkv", "ogv", "3gp", "wmv",
  // Subtitles
  "vtt", "srt", "ass", "ssa",
  // 3D / models
  "glb", "gltf", "obj", "fbx", "stl", "usdz", "ply",
  // Data / markup
  "json", "xml", "csv", "tsv", "txt", "md", "yaml", "yml", "toml",
  "html", "htm", "css",
  // Documents
  "pdf", "epub",
  // Archives (downloadable assets)
  "zip", "gz", "tar", "7z",
  // Web manifests
  "webmanifest", "manifest",
])
