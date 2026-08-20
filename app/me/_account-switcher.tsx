"use client"

import { useEffect, useState } from "react"
import { Button, Chip, Dropdown, toast } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { apiFetch } from "@/lib/http/fetch"
import { API_BASE, SIDEBAR_WIDTH } from "@/constants"
import { decryptE2E, getStoredMasterKey, activateStoredMasterKey, forgetStoredMasterKey } from "@/lib/security/cryptoClient"
import { errorMessage } from "@/lib/errors"

const DEFAULT_AVATAR = "https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg"
const RATE_LIMITED = "You're performing actions too quickly, slow down."

async function csrf(): Promise<string> {
  const res = await apiFetch("/api/v2/csrf", { credentials: "include" })
  const { token } = await res.json()
  return token
}

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
  const [busy, setBusy] = useState(false)

  // Fetched with the page, not on open, so the menu is complete the first time
  // it's pulled down instead of filling in under the cursor.
  useEffect(() => {
    let cancelled = false
    apiFetch("/api/v2/auth/accounts")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load accounts")
        const list = await Promise.all((data.accounts as ApiAccount[]).map(toSwitchable))
        if (cancelled) return
        if (list.length > 0) setAccounts(list)
        setCanAddMore(data.canAddMore !== false)
      })
      .catch((err) => { if (!cancelled) toast.danger(errorMessage(err)) })
    return () => { cancelled = true }
  }, [])

  const switchTo = async (account: SwitchableAccount) => {
    // Without the master key nothing on the account would decrypt, so send them
    // through a real sign-in instead of into a half-broken session.
    if (!account.canSwitch) {
      window.location.assign("/signin?add=1")
      return
    }
    setBusy(true)
    try {
      const res = await apiFetch("/api/v2/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, csrfToken: await csrf() }),
      })
      if (res.status === 429) throw new Error(RATE_LIMITED)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to switch account")
      activateStoredMasterKey(account.id)
      // full reload, every cached list and decrypted name belongs to the old account
      window.location.assign("/me/storage")
    } catch (err) {
      toast.danger(errorMessage(err))
      setBusy(false)
    }
  }

  const signOut = async (account: SwitchableAccount) => {
    setBusy(true)
    try {
      const res = await apiFetch("/api/v2/auth/accounts/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, csrfToken: await csrf() }),
      })
      if (res.status === 429) throw new Error(RATE_LIMITED)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to sign out")

      forgetStoredMasterKey(account.id)

      if (!account.isCurrent) {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id))
        setCanAddMore(true)
        setBusy(false)
        return
      }
      // signed out of the account in use: the server handed the session to the
      // next one, so make its key active before anything tries to decrypt
      if (data.next) {
        activateStoredMasterKey(data.next)
        window.location.assign("/me/storage")
      } else {
        window.location.assign("/")
      }
    } catch (err) {
      toast.danger(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dropdown>
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
          disabledKeys={busy ? accounts.map((a) => a.id).concat("add-account") : []}
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
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {account.isCurrent && (
                  <Chip size="sm" color="accent" className="shrink-0 text-[11px]">
                    Logged in
                  </Chip>
                )}
                {/* react-aria presses don't bubble, and the pointer handler stops
                    the raw event, so hitting this never fires the row's switch */}
                <span
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* sized to match Chip sm, same trick the account menu uses */}
                  <Button
                    variant="danger-soft"
                    size="sm"
                    aria-label={`Sign out ${account.name}`}
                    isDisabled={busy}
                    onPress={() => signOut(account)}
                    className="shrink-0 h-5 px-2 text-[11px] md:h-5 rounded-2xl"
                  >
                    Sign out
                  </Button>
                </span>
              </span>
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
