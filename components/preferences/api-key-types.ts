import { type V3Scope } from "@/lib/http/v3/scopes"

export interface ApiKeySummary {
  id: string
  name: string
  hint: string
  scopes: V3Scope[]
  createdAt: string
  lastUsedAt: string | null
  /** Ranks past the plan's allowance after a downgrade — shown, but inert. */
  overLimit: boolean
}

/** Only ever present in the create response — the key is never returned again. */
export interface CreatedApiKey extends Omit<ApiKeySummary, "lastUsedAt" | "overLimit"> {
  key: string
}

export function formatUsed(lastUsedAt: string | null): string {
  if (!lastUsedAt) return "Never used"
  const diff = Date.now() - new Date(lastUsedAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Used just now"
  if (mins < 60) return `Used ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Used ${hours}h ago`
  return `Used ${Math.floor(hours / 24)}d ago`
}
