/**
 * Security-related constants shared between API validation and client-side logic.
 */

/** MIME types that are always blocked from upload regardless of extension */
export const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-ms-installer",
  "application/x-executable",
  "application/x-shockwave-flash",
  "application/x-java-archive",
  "application/x-php",
  "application/x-shellscript",
  "application/x-bat",
  "application/vnd.microsoft.portable-executable",
])

/** File extensions that are always blocked from upload */
export const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "com", "scr", "pif", "gadget",
  "bat", "cmd", "ps1", "psm1", "psd1", "vbs", "vbe",
  "wsf", "wsh", "msc", "reg",
  "sh", "bash", "zsh", "csh", "fish", "command",
  "php", "php3", "php4", "php5", "phtml",
  "asp", "aspx", "ashx", "asmx",
  "jsp", "jspx", "cgi",
  "py", "pyw", "pyc",
  "pl", "pm", "rb",
  "jar", "war", "class",
  "lnk", "url", "inf", "ins",
])


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
