"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Spinner } from "@heroui/react"
import { apiFetch } from "@/lib/http/fetch"
import { hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"

export interface InviteCode {
  code: string
  maxUses: number
  usesCount: number
  redeemedBy: string[]
  createdAt: string
}

export interface AdminUser {
  id: string
  displayName: string | null
  avatarUrl: string | null
  tier: "free" | "plus" | "pro" | "max"
  suspended: boolean
  isOwner: boolean
  storageUsed: number
  createdAt: string
  lastLogin: string | null
}

export interface BlacklistEntry {
  ipHash: string
  reason: string | null
  createdAt: string
}

export const USERS_PAGE_SIZE = 25

interface AdminData {
  codes: InviteCode[]
  users: AdminUser[]
  blacklist: BlacklistEntry[]
  userSearch: string
  usersHaveMore: boolean
  setUserSearch: (value: string) => void
  refreshCodes: () => Promise<void>
  refreshBlacklist: () => Promise<void>
  // append sticks the next page on the end, otherwise the list is replaced
  loadUsers: (opts?: { q?: string; append?: boolean }) => Promise<void>
}

const AdminDataContext = createContext<AdminData | null>(null)

export function useAdminData() {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error("useAdminData must be used inside AdminDataProvider")
  return ctx
}

// One request when the page opens. Tabs unmount their panels, so the lists live
// up here instead, and only a mutation goes back to the server.
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [codes, setCodes] = useState<InviteCode[] | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [usersHaveMore, setUsersHaveMore] = useState(true)

  useEffect(() => {
    apiFetch("/api/v2/admin/overview")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load admin data")
        setUsers(data.users)
        setBlacklist(data.blacklist)
        setUsersHaveMore(data.users.length === USERS_PAGE_SIZE)
        setCodes(data.codes)
      })
      .catch((err) => hypaError(errorMessage(err)))
  }, [])

  const refreshCodes = async () => {
    try {
      const res = await apiFetch("/api/v2/admin/invite-codes")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load invite codes")
      setCodes(data.codes)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  const refreshBlacklist = async () => {
    try {
      const res = await apiFetch("/api/v2/admin/blacklist")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load blacklist")
      setBlacklist(data.entries)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  const loadUsers = async (opts: { q?: string; append?: boolean } = {}) => {
    const q = opts.q ?? userSearch
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("offset", String(opts.append ? users.length : 0))
      const res = await apiFetch(`/api/v2/admin/users?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load accounts")
      setUsers((prev) => (opts.append ? [...prev, ...data.users] : data.users))
      setUsersHaveMore(data.users.length === USERS_PAGE_SIZE)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  if (codes === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <AdminDataContext.Provider
      value={{
        codes, users, blacklist, userSearch, usersHaveMore,
        setUserSearch, refreshCodes, refreshBlacklist, loadUsers,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  )
}
