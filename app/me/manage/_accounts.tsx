"use client"

import { useState } from "react"
import {
  Autocomplete, Avatar, Button, Card, Chip, ListBox, ListBoxItem,
  SearchField, Spinner, Table, Typography,
} from "@heroui/react"
import { apiFetch } from "@/lib/http/fetch"
import { useManage } from "@/hooks/useManage"
import { hypaConfirm, hypaToast, hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"
import { formatTierSize } from "@/constants/tier-limits"
import { useAdminData, type AdminUser } from "./_data"

const TIER_LABEL: Record<AdminUser["tier"], string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
}
const TIERS = Object.keys(TIER_LABEL) as AdminUser["tier"][]

export function AccountsPanel() {
  const { user: currentUser } = useManage()
  const { users, usersHaveMore, userSearch, setUserSearch, loadUsers } = useAdminData()
  const [loadingMore, setLoadingMore] = useState(false)

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadUsers({ append: true })
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
      await loadUsers()
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
    if (confirmed) await loadUsers()
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
    if (confirmed) await loadUsers()
  }

  return (
    <Card>
      <Card.Header className="flex-row flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col">
          <Card.Title>Accounts</Card.Title>
          <Card.Description>Search by account id or display name.</Card.Description>
        </div>
        <SearchField
          value={userSearch}
          onChange={setUserSearch}
          onSubmit={(q) => loadUsers({ q })}
          onClear={() => loadUsers({ q: "" })}
          aria-label="Search accounts"
          className="w-64"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="id or name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Card.Header>

      <Card.Content className="gap-0">
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Accounts">
              <Table.Header>
                <Table.Column isRowHeader>Account</Table.Column>
                {/* the autocomplete popover is capped to the trigger width, so the column needs room for its search box */}
                <Table.Column className="w-44">Tier</Table.Column>
                <Table.Column>Storage</Table.Column>
                <Table.Column>Joined</Table.Column>
                <Table.Column className="w-48 text-right">Actions</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <Typography type="body-sm" color="muted" className="block py-10 text-center">
                    No accounts match.
                  </Typography>
                )}
              >
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <Table.Row key={u.id} id={u.id}>
                      <Table.Cell className="py-2">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            {u.avatarUrl && <Avatar.Image src={u.avatarUrl} alt="" />}
                            <Avatar.Fallback color={u.suspended ? "danger" : "accent"}>
                              {(u.displayName ?? u.id).slice(0, 2).toUpperCase()}
                            </Avatar.Fallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Typography type="body-sm" weight="medium" className="text-foreground">
                                {u.displayName ?? "no display name"}
                              </Typography>
                              {u.isOwner && <Chip size="sm" variant="soft" color="accent">owner</Chip>}
                              {u.suspended && <Chip size="sm" variant="soft" color="danger">suspended</Chip>}
                            </div>
                            <Typography type="body-xs" color="muted">{u.id}</Typography>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <Autocomplete
                          aria-label="Tier"
                          selectedKey={u.tier}
                          onSelectionChange={(key) => handleTierChange(u.id, String(key))}
                        >
                          <Autocomplete.Trigger className="min-h-8 w-full py-1">
                            <Autocomplete.Value>{TIER_LABEL[u.tier]}</Autocomplete.Value>
                            <Autocomplete.Indicator />
                          </Autocomplete.Trigger>
                          {/* popover defaults to bg-overlay, way darker than the table sitting behind it */}
                          <Autocomplete.Popover className="bg-surface-tertiary">
                            <Autocomplete.Filter>
                              <SearchField aria-label="Filter tiers" autoFocus>
                                <SearchField.Group>
                                  <SearchField.SearchIcon />
                                  <SearchField.Input placeholder="Search..." />
                                </SearchField.Group>
                              </SearchField>
                              <ListBox aria-label="Tier options">
                                {TIERS.map((t) => (
                                  <ListBoxItem key={t} id={t} textValue={TIER_LABEL[t]}>
                                    {TIER_LABEL[t]}
                                  </ListBoxItem>
                                ))}
                              </ListBox>
                            </Autocomplete.Filter>
                          </Autocomplete.Popover>
                        </Autocomplete>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <Typography type="body-sm" color="muted">{formatTierSize(u.storageUsed)}</Typography>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <Typography type="body-sm" color="muted">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </Typography>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <div className="flex items-center justify-end gap-2">
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

          {users.length > 0 && (
            <Table.Footer className="justify-between">
              <Typography type="body-xs" color="muted">
                {users.length} account{users.length === 1 ? "" : "s"} shown
              </Typography>
              {usersHaveMore && (
                <Button variant="secondary" size="sm" isDisabled={loadingMore} onPress={handleLoadMore}>
                  {loadingMore ? <Spinner size="sm" /> : null}
                  Load more
                </Button>
              )}
            </Table.Footer>
          )}
        </Table>
      </Card.Content>
    </Card>
  )
}
