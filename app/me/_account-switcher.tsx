"use client"

import { useState } from "react"
import { Chip, Dropdown, toast } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { apiFetch } from "@/lib/http/fetch"
import { API_BASE, SIDEBAR_WIDTH } from "@/constants"
import { decryptE2E, getStoredMasterKey, activateStoredMasterKey } from "@/lib/security/cryptoClient"
import { errorMessage } from "@/lib/errors"

const DEFAULT_AVATAR = "https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg"

interface SwitchableAccount {
  id: string
  name: string
  isCurrent: boolean
  /** false when this browser no longer holds the account's master key */
  canSwitch: boolean
}

interface ApiAccount {
  id: string
  nicknameEncrypted: string
  displayName: string | null
  isCurrent: boolean
}

// Nicknames are E2E encrypted, so the server can't name these accounts. Each one
// is decrypted locally with its own stashed master key.
async function toSwitchable(a: ApiAccount): Promise<SwitchableAccount> {
  const key = await getStoredMasterKey(a.id)
  let name = a.displayName ?? a.id.slice(0, 8)
  if (key) {
    const decrypted = await decryptE2E(a.nicknameEncrypted, key)
    if (decrypted && decrypted !== "Encrypted User" && decrypted !== "Corrupt Data") name = decrypted
  }
  return { id: a.id, name, isCurrent: a.isCurrent, canSwitch: Boolean(key) }
}

export function AccountSwitcher({ userId, nickname, hasAvatar }: { userId: string; nickname: string; hasAvatar: boolean }) {
  // seeded with the signed-in account so the menu is never empty on first open
  const [accounts, setAccounts] = useState<SwitchableAccount[]>([
    { id: userId, name: nickname, isCurrent: true, canSwitch: true },
  ])
  const [canAddMore, setCanAddMore] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [switching, setSwitching] = useState(false)

  const load = async () => {
    try {
      const res = await apiFetch("/api/v2/auth/accounts")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load accounts")
      const list = await Promise.all((data.accounts as ApiAccount[]).map(toSwitchable))
      if (list.length > 0) setAccounts(list)
      setCanAddMore(data.canAddMore !== false)
      setLoaded(true)
    } catch (err) {
      toast.danger(errorMessage(err))
    }
  }

  const switchTo = async (account: SwitchableAccount) => {
    // Without the master key nothing on the account would decrypt, so send them
    // through a real sign-in instead of into a half-broken session.
    if (!account.canSwitch) {
      window.location.assign("/signin?add=1")
      return
    }
    setSwitching(true)
    try {
      const csrfRes = await apiFetch("/api/v2/csrf", { credentials: "include" })
      const { token: csrfToken } = await csrfRes.json()
      const res = await apiFetch("/api/v2/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, csrfToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to switch account")
      activateStoredMasterKey(account.id)
      // full reload, every cached list and decrypted name belongs to the old account
      window.location.assign("/me/storage")
    } catch (err) {
      toast.danger(errorMessage(err))
      setSwitching(false)
    }
  }

  return (
    <Dropdown onOpenChange={(open) => { if (open && !loaded) load() }}>
      <Dropdown.Trigger
        aria-label="Switch account"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-3xl transition-colors duration-150 cursor-pointer bg-background border border-white/10 text-foreground hover:bg-white/5 data-[pressed=true]:!transform-none active:!transform-none"
        style={{ height: 38, paddingLeft: 8, paddingRight: 8, fontSize: 14 }}
      >
        <img decoding="async"
          src={hasAvatar ? `${API_BASE}/avatar` : DEFAULT_AVATAR}
          alt={nickname}
          className="shrink-0 object-cover rounded-full select-none pointer-events-none"
          style={{ width: "1.3em", height: "1.3em" }}
          draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
        />
        <span className="min-w-0 flex-1 truncate text-left font-medium">{nickname}</span>
        <MIcon name="expand_all" size={10} className="shrink-0 text-muted" />
      </Dropdown.Trigger>

      <Dropdown.Popover
        placement="bottom"
        containerPadding={8}
        offset={8}
        className="p-0 overflow-hidden bg-background border border-white/10"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <Dropdown.Menu
          aria-label="Accounts"
          className="p-1.5"
          disabledKeys={switching ? accounts.map((a) => a.id).concat("add-account") : []}
        >
          {accounts.map((account) => (
            <Dropdown.Item
              key={account.id}
              id={account.id}
              textValue={account.name}
              onAction={() => {
                if (account.isCurrent) {
                  toast.warning("You're already logged in on this account")
                  return
                }
                switchTo(account)
              }}
              className="flex items-center gap-2"
            >
              <img decoding="async"
                src={account.isCurrent && hasAvatar ? `${API_BASE}/avatar` : DEFAULT_AVATAR}
                alt={account.name}
                className="h-5 w-5 shrink-0 rounded-full object-cover select-none pointer-events-none"
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
              />
              <span className="min-w-0 truncate">{account.name}</span>
              {account.isCurrent && (
                <Chip size="sm" color="accent" className="ml-auto shrink-0 text-[11px]">
                  <MIcon name="check_circle" size={12} />
                  Logged in
                </Chip>
              )}
            </Dropdown.Item>
          ))}
          {canAddMore ? (
            <Dropdown.Item
              id="add-account"
              textValue="Add another account"
              onAction={() => { window.location.assign("/signin?add=1") }}
              className="flex items-center gap-2"
            >
              <MIcon name="add" size={20} className="shrink-0" />
              <span>Add another account</span>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
