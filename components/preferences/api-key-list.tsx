"use client"

import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { apiFetch } from "@/lib/http/fetch"
import { type ApiKeySummary, formatUsed } from "./api-key-types"

export function ApiKeyList({ keys, onChanged }: { keys: ApiKeySummary[]; onChanged: () => void }) {
  const revoke = async (key: ApiKeySummary) => {
    const confirmed = await hypaConfirm({
      title: `Revoke "${key.name}"?`,
      description: "Anything using this key stops working right away. This cannot be undone.",
      items: [],
      confirmText: "Revoke",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    const res = await apiFetch(`/api/v2/keys/${key.id}`, { method: "DELETE" })
    if (res.ok) onChanged()
  }

  return (
    <div className="divide-y divide-[#e8e8e8] dark:divide-[rgba(255,255,255,0.06)] border-t border-[#e8e8e8] dark:border-[rgba(255,255,255,0.06)]">
      {keys.map((key) => (
        <div key={key.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[13px] font-medium ${key.overLimit ? "text-[#aaa] dark:text-[#6b7076]" : "text-[#111] dark:text-[#f0f0f0]"}`}>
                {key.name}
              </span>
              <code className="text-[11px] text-[#888] dark:text-[#6b7076]">{key.hint}••••</code>
              {key.overLimit && (
                <span className="text-[10px] font-medium text-[#b45309] dark:text-[#fbbf24] bg-[rgba(234,179,8,0.12)] px-1.5 py-0.5 rounded">
                  Over plan limit
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#888] dark:text-[#6b7076] mt-1 truncate">
              {key.scopes.join(", ")}
            </p>
            <p className="text-[11px] text-[#aaa] dark:text-[#5a5f66] mt-0.5">
              {key.overLimit ? "Inactive until you upgrade or revoke an older key" : formatUsed(key.lastUsedAt)}
            </p>
          </div>
          <SecondaryButton size="xs" danger onClick={() => revoke(key)} style={{ height: 26, gap: 5 }}>
            <MIcon name="delete" size={13} />
            Revoke
          </SecondaryButton>
        </div>
      ))}
    </div>
  )
}
