"use client"

import { useEffect, useState } from "react"
import { Button, InputGroup, Table, Select, ListBox, ListBoxItem, Chip } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { apiFetch } from "@/lib/http/fetch"
import { useManage } from "@/hooks/useManage"
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

const TIER_LABEL: Record<AdminUser["tier"], string> = {
  free: "Free",
  essential: "Essential",
  premium: "Pro",
  ultimate: "Max",
}
const TIERS = Object.keys(TIER_LABEL) as AdminUser["tier"][]
const PAGE_SIZE = 25

export function AccountsPanel() {
  const { user: currentUser } = useManage()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [search, setSearch] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // append=false replaces the list (fresh search or first load), true sticks
  // the next page on the end for "Load more".
  const load = async (opts: { q?: string; offset?: number; append?: boolean } = {}) => {
    try {
      const params = new URLSearchParams()
      if (opts.q) params.set("q", opts.q)
      params.set("offset", String(opts.offset ?? 0))
      const res = await apiFetch(`/api/v2/admin/users?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load accounts")
      setUsers((prev) => (opts.append && prev ? [...prev, ...data.users] : data.users))
      setHasMore(data.users.length === PAGE_SIZE)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load({ q: search.trim() || undefined })
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await load({ q: search.trim() || undefined, offset: users?.length ?? 0, append: true })
    setLoadingMore(false)
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
      await load({ q: search.trim() || undefined })
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
    if (confirmed) await load({ q: search.trim() || undefined })
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
    if (confirmed) await load({ q: search.trim() || undefined })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#e3e3e3]">Accounts</h2>
        <form onSubmit={handleSearch}>
          <InputGroup>
            <InputGroup.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id or name"
              aria-label="Search accounts"
              className="w-56"
            />
            <InputGroup.Suffix className="p-0.5">
              <Button type="submit" variant="secondary" size="sm" isIconOnly aria-label="Search">
                <MIcon name="search" size={16} />
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
        </form>
      </div>

      {users === null ? (
        <div className="py-8 flex justify-center"><LoadingSvg /></div>
      ) : users.length === 0 ? (
        <p className="text-[13.5px] text-[#898e97]">No accounts match.</p>
      ) : (
        <>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Accounts">
                <Table.Header>
                  <Table.Column isRowHeader>Account</Table.Column>
                  <Table.Column>Tier</Table.Column>
                  <Table.Column>Storage</Table.Column>
                  <Table.Column>Joined</Table.Column>
                  <Table.Column className="text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <Table.Row key={u.id} id={u.id}>
                        <Table.Cell className="py-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12.5px]">{u.id}</span>
                            {u.isOwner && <Chip size="sm" variant="soft" color="accent">owner</Chip>}
                            {u.suspended && <Chip size="sm" variant="soft" color="danger">suspended</Chip>}
                          </div>
                          <p className="text-[12px] text-muted mt-0.5">{u.displayName ?? "no display name"}</p>
                        </Table.Cell>
                        <Table.Cell className="py-1.5">
                          <Select
                            aria-label="Tier"
                            selectedKey={u.tier}
                            onSelectionChange={(key) => handleTierChange(u.id, String(key))}
                          >
                            <Select.Trigger className="w-28" style={{ height: 32 }}>
                              <Select.Value>{TIER_LABEL[u.tier]}</Select.Value>
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox aria-label="Tier options">
                                {TIERS.map((t) => (
                                  <ListBoxItem key={t} id={t} textValue={TIER_LABEL[t]}>
                                    {TIER_LABEL[t]}
                                  </ListBoxItem>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </Table.Cell>
                        <Table.Cell className="py-1.5 text-muted">{formatTierSize(u.storageUsed)}</Table.Cell>
                        <Table.Cell className="py-1.5 text-muted">{new Date(u.createdAt).toLocaleDateString()}</Table.Cell>
                        <Table.Cell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="secondary" size="sm" isDisabled={isSelf} onPress={() => handleToggleSuspend(u)}>
                              {u.suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                            <Button variant="danger-soft" size="sm" isDisabled={isSelf} onPress={() => handleDelete(u.id)}>
                              Delete
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" isDisabled={loadingMore} onPress={handleLoadMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
