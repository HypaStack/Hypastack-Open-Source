// Shared types, formatters and motion variants for the CDN page.
import { MIcon } from "@/components/ui/material-icon"

export interface CdnAsset {
  id: string
  name: string
  size: number
  contentType: string
  cdnUrl: string
  folderId: string | null
  createdAt: string
}

export interface CdnFolder {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

export function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <MIcon name="image" size={20} className="text-zinc-500" />
  }
  return <MIcon name="description" size={20} className="text-muted-foreground" />
}
