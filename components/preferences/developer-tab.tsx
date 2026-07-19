"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { getTierLimits, isPaidTier } from "@/constants"
import { type PreferencesTab, type PreferencesUser, resolveTier } from "./shared"
import { PaidOnlyNotice } from "./paid-only-notice"

const CARD = "bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"

// What a key is allowed to do. Off by default — a fresh key reads and nothing else.
const SCOPES = [
  { id: "files.read", label: "Read files", hint: "List your files and read their metadata.", locked: true },
  { id: "files.write", label: "Upload files", hint: "Create new uploads on your account." },
  { id: "files.delete", label: "Delete files", hint: "Permanently remove files. Cannot be undone." },
  { id: "cdn.write", label: "Manage CDN", hint: "Upload, swap and delete CDN assets." },
] as const

export function DeveloperTab({ user, onSwitchTab }: { user: PreferencesUser; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const tier = resolveTier(user)
  const unlocked = isPaidTier(tier)
  const maxKeys = getTierLimits(tier).maxApiKeys
  const [scopes, setScopes] = useState<Record<string, boolean>>({ "files.read": true })

  return (
    <div className="space-y-4">
      {!unlocked && <PaidOnlyNotice onSwitchTab={onSwitchTab} />}

      <div className={CARD} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-center gap-2 mb-1">
          <MIcon name="terminal" size={16} className="text-[#666] dark:text-[#898e97]" />
          <p className="text-[13px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Hypastack API</p>
        </div>
        <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed">
          A plain REST API over your account. Every response is JSON, every failure carries a code you can switch on. Keys are shown once when you make them, so put yours somewhere safe.
        </p>
      </div>

      <div className={CARD} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">API keys</p>
            <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5">
              {unlocked ? `0 of ${maxKeys} used on ${getTierLimits(tier).label}` : "No keys on Free"}
            </p>
          </div>
          <ShineButton size="sm" disabled={!unlocked} style={{ height: 32, gap: 6 }}>
            <MIcon name="add" size={15} />
            New key
          </ShineButton>
        </div>

        <div
          className="flex flex-col items-center justify-center text-center border border-dashed border-[#ddd] dark:border-[rgba(255,255,255,0.1)]"
          style={{ borderRadius: 10, padding: '22px 16px' }}
        >
          <MIcon name="key" size={20} className="text-[#bbb] dark:text-[#5a5f66] mb-1.5" />
          <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">No keys yet</p>
          <p className="text-[12px] text-[#aaa] dark:text-[#6b7076] mt-0.5 max-w-[280px] leading-snug">
            Make one to start calling the API from your own code.
          </p>
        </div>
      </div>

      <div className={CARD} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Permissions</p>
        <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 mb-3">
          What a new key is allowed to do. Anything left off returns a 403 with a clear reason.
        </p>
        <div className="space-y-2">
          {SCOPES.map((s) => {
            const locked = "locked" in s && s.locked
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 bg-white dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
                style={{ borderRadius: 10, padding: '10px 12px' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[12px] font-medium text-[#111] dark:text-[#f0f0f0]">{s.id}</code>
                    <span className="text-[12px] text-[#888] dark:text-[#898e97]">{s.label}</span>
                  </div>
                  <p className="text-[12px] text-[#aaa] dark:text-[#6b7076] mt-0.5 leading-snug">{s.hint}</p>
                </div>
                <ToggleSwitch
                  checked={!!scopes[s.id]}
                  onChange={(v) => setScopes((prev) => ({ ...prev, [s.id]: v }))}
                  disabled={!unlocked || locked}
                  width={40}
                  height={24}
                  aria-label={s.label}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className={CARD} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Limits</p>
        <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 mb-3">
          Every response carries your remaining budget in the headers, so you never have to guess.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <LimitRow label="Keys on this plan" value={unlocked ? String(maxKeys) : "None"} />
          <LimitRow label="Requests" value="Per key, per minute" />
        </div>
      </div>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between bg-white dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
      style={{ borderRadius: 10, padding: '9px 12px' }}
    >
      <span className="text-[12px] text-[#888] dark:text-[#898e97]">{label}</span>
      <span className="text-[12px] font-medium text-[#111] dark:text-[#f0f0f0]">{value}</span>
    </div>
  )
}
