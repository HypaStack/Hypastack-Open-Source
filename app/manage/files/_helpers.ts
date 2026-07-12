// Pure helpers + view types shared by the files page and its views.

export function getFileExt(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

export function getFileTypeLabel(name: string, contentType?: string): string {
  const ext = getFileExt(name)
  if (ext) return ext.toUpperCase()
  if (contentType) {
    const sub = contentType.split("/")[1]
    if (sub) return sub.toUpperCase()
  }
  return "FILE"
}

export function isImagePreviewable(contentType?: string, name?: string): boolean {
  if (contentType?.startsWith("image/")) return true
  if (name) {
    const ext = getFileExt(name)
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return true
  }
  return false
}

export function getFileIconForType(contentType?: string, name?: string): string {
  const ct = contentType || ""
  const ext = name ? getFileExt(name) : ""
  if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return "image"
  if (ct.startsWith("audio/") || ["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) return "music_note"
  if (ct.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "videocam"
  if (ct === "application/pdf" || ext === "pdf") return "article"
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || ct.includes("zip") || ct.includes("compressed")) return "archive"
  if (
    ["json", "js", "jsx", "ts", "tsx", "html", "css", "xml", "yaml", "yml", "toml", "sh"].includes(ext) ||
    ct.includes("javascript") ||
    ct.includes("json")
  )
    return "code"
  if (["exe", "msi", "dmg", "app", "apk"].includes(ext)) return "rocket_launch"
  if (["txt", "md", "rtf"].includes(ext) || ct.startsWith("text/")) return "article"
  if (["dll", "so", "dylib", "bin"].includes(ext)) return "package_2"
  return "description"
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleDateString("en-US", { month: "short" })
  const year = d.getFullYear()
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${day} ${month}, ${year} at ${time}`
}


export type ViewMode = "list" | "grid"
export type SortField = "name" | "size" | "date"
export type SortDirection = "asc" | "desc"
