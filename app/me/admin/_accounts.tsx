"use client"

import { useEffect, useState } from "react"
import { Button, TextField, Input, Label, Chip } from "@heroui/react"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { apiFetch } from "@/lib/http/fetch"
import { hypaConfirm, hypaToast, hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"
import { formatTierSize } from "@/constants/tier-limits"

interface AdminUser {
  id: string
  displayName: string | null
  tier: "free" | "essential" | "premium" | "ultimate"
  suspended: boolean
  isOwner: boolean
  storageUsed: number
  createdAt: string
  lastLogin: string | null
}

const TIERS: AdminUser["tier"][] = ["free", "essential", "premium", "ultimate"]

export function AccountsPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [search, setSearch] = useState("")

  const load = async (q?: string) => {
    try {
      const url = q ? `/api/v2/admin/users?q=${encodeURIComponent(q)}` : "/api/v2/admin/users"
      const res = await apiFetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load accounts")
      setUsers(data.users)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search.trim() || undefined)
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await apiFetch(`/api/v2/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to update account")
  }

  const handleTierChange = async (id: string, tier: string) => {
    try {
      await patch(id, { tier })
      hypaToast({ title: "Tier updated" })
      await load(search.trim() || undefined)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  const handleToggleSuspend = async (u: AdminUser) => {
    const confirmed = await hypaConfirm({
      title: u.suspended ? "Unsuspend this account?" : "Suspend this account?",
      description: u.suspended
        ? "They'll be able to sign in again."
        : "This signs them out everywhere and blocks login until unsuspended.",
      confirmText: u.suspended ? "Unsuspend" : "Suspend",
      destructive: !u.suspended,
      onConfirm: async () => { await patch(u.id, { suspended: !u.suspended }) },
    })
    if (confirmed) await load(search.trim() || undefined)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await hypaConfirm({
      title: "Delete this account permanently?",
      description: "Their files, CDN assets, funnels, sessions and API keys are all deleted. This cannot be undone.",
      confirmText: "Delete forever",
      destructive: true,
      onConfirm: async () => {
        const res = await apiFetch(`/api/v2/admin/users/${id}`, { method: "DELETE" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to delete account")
      },
    })
    if (confirmed) await load(search.trim() || undefined)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#e3e3e3]">Accounts</h2>
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <TextField value={search} onChange={setSearch} className="w-56">
            <Label className="text-[12px]">Search by id or name</Label>
            <Input placeholder="account id or display name" />
          </TextField>
          <Button variant="tertiary" size="sm" type="submit" style={{ height: 38 }}>Search</Button>
        </form>
      </div>

      {users === null ? (
        <div className="py-8 flex justify-center"><LoadingSvg /></div>
      ) : users.length === 0 ? (
        <p className="text-[13.5px] text-[#898e97]">No accounts match.</p>
      ) : (
        <div className="divide-y divide-[rgba(255,255,255,0.06)] border-t border-b border-[rgba(255,255,255,0.06)]">
          {users.map((u) => (
            <div key={u.id} className="py-3 flex items-center gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[12.5px] text-[#171717] dark:text-[#e3e3e3] font-mono">{u.id}</code>
                  {u.isOwner && <Chip size="sm" variant="soft" color="accent">owner</Chip>}
                  {u.suspended && <Chip size="sm" variant="soft" color="danger">suspended</Chip>}
                </div>
                <p className="text-[12px] text-[#898e97] mt-0.5">
                  {u.displayName ?? "no display name"} &middot; {formatTierSize(u.storageUsed)} used &middot; joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <select
                  value={u.tier}
                  onChange={(e) => handleTierChange(u.id, e.target.value)}
                  disabled={u.isOwner}
                  className="text-[12.5px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-transparent px-2 py-1.5 text-[#171717] dark:text-[#e3e3e3]"
                >
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button variant="ghost" size="sm" isDisabled={u.isOwner} onPress={() => handleToggleSuspend(u)}>
                  {u.suspended ? "Unsuspend" : "Suspend"}
                </Button>
                <Button variant="ghost" size="sm" isDisabled={u.isOwner} onPress={() => handleDelete(u.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
