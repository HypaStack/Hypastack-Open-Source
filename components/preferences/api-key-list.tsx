"use client"

import { MIcon } from "@/components/ui/material-icon"
import { Button, Chip, Separator, Typography } from "@heroui/react"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { apiFetch } from "@/lib/http/fetch"
import { type ApiKeySummary, formatUsed } from "./api-key-types"

export function ApiKeyList({ keys, onChanged }: { keys: ApiKeySummary[]; onChanged: () => void }) {
  const revoke = async (key: ApiKeySummary) => {
    const confirmed = await hypaConfirm({
      title: `Revoke "${key.name}"?`,
      description: "Anything using this key stops working right away. This cannot be undone.",
      confirmText: "Revoke",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    const res = await apiFetch(`/api/v2/keys/${key.id}`, { method: "DELETE" })
    if (res.ok) onChanged()
  }

  return (
    <div>
      {keys.map((key, i) => (
        <div key={key.id}>
          {i > 0 && <Separator />}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Typography type="body" weight="semibold" className={key.overLimit ? "text-muted" : "text-foreground"}>
                  {key.name}
                </Typography>
                <code className="text-[11px] text-muted">{key.hint}••••</code>
                {key.overLimit && (
                  <Chip size="sm" variant="soft" color="warning">Over plan limit</Chip>
                )}
              </div>
              <Typography type="body-sm" color="muted" className="mt-1 truncate">
                {key.scopes.join(", ")}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-0.5">
                {key.overLimit ? "Inactive until you upgrade or revoke an older key" : formatUsed(key.lastUsedAt)}
              </Typography>
            </div>
            <Button variant="danger-soft" size="sm" onPress={() => revoke(key)} style={{ height: 26, gap: 5 }}>
              <MIcon name="delete" size={13} />
              Revoke
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
