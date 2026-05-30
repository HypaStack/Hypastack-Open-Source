"use client"

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react"
import { getSessionKey, decryptE2E } from "@/lib/crypto-client"

export type Tier = "free" | "essential" | "premium" | "ultimate"

interface User {
  id: string
  nickname: string
  avatarUrl: string | null
  createdAt: string
  premium: boolean
  tier: Tier
  lastAcknowledgedTier: Tier
  inactivityPurgeDays: number
  is_insider: number
}

export interface StorageStats {
  totalStorage: number
  maxStorage: number
  storagePercent: number
  cdnAssets?: number
  cdnStorage?: number
  dailyDownloads?: { date: string; count: number }[]
  tierLabel?: string
}

export interface FileItem {
  id: string
  name: string
  size: number
  contentType?: string
  uploadedAt: string
  expiresAt: string
  downloads: number
  hasPin: boolean
  burnOnRead: boolean
  starred: boolean
  shareUrl: string
  folderId: string | null
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

export interface CdnAssetItem {
  id: string
  name: string
  size: number
  contentType: string
  cdnUrl: string
  folderId: string | null
  createdAt: string
}

export interface CdnFolderItem {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

interface AuthContextType {
  user: User | null
  stats: StorageStats | null
  files: FileItem[]
  folders: FolderItem[]
  cdnAssets: CdnAssetItem[]
  cdnFolders: CdnFolderItem[]
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>
  setFolders: React.Dispatch<React.SetStateAction<FolderItem[]>>
  setCdnAssets: React.Dispatch<React.SetStateAction<CdnAssetItem[]>>
  setCdnFolders: React.Dispatch<React.SetStateAction<CdnFolderItem[]>>
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 800

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [cdnAssets, setCdnAssets] = useState<CdnAssetItem[]>([])
  const [cdnFolders, setCdnFolders] = useState<CdnFolderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const retryCountRef = useRef(0)

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/v2/auth/me", {
        credentials: "include",
      })

      if (response.status === 429) {
        // Rate limited — don't treat as unauthenticated, retry if under max
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          setTimeout(() => fetchUser(), RETRY_DELAY_MS * retryCountRef.current)
          return
        }
        // Max retries exceeded — keep existing user state if any
        setIsLoading(false)
        return
      }

      retryCountRef.current = 0

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated === false) {
          setUser(null)
          setStats(null)
          setFiles([])
          setFolders([])
          setCdnAssets([])
          setCdnFolders([])
        } else {
          // --- E2E Decryption for Nickname ---
          if (data.user && data.user.nickname_encrypted) {
            try {
              const sessionKey = await getSessionKey()
              if (sessionKey) {
                data.user.nickname = await decryptE2E(data.user.nickname_encrypted, sessionKey)
              } else {
                data.user.nickname = "Encrypted User"
              }
            } catch (err) {
              console.error("Failed to decrypt username", err)
              data.user.nickname = "Encrypted User"
            }
          }

          setUser(data.user)
          if (data.stats) setStats(data.stats)
          if (data.files) setFiles(data.files)
          if (data.folders) setFolders(data.folders)
          if (data.cdnAssets) setCdnAssets(data.cdnAssets)
          if (data.cdnFolders) setCdnFolders(data.cdnFolders)
        }
      } else if (response.status === 401) {
        setUser(null)
        setStats(null)
        setFiles([])
        setFolders([])
        setCdnAssets([])
        setCdnFolders([])
      } else {
        // Other error (404, 500) — don't clear user on transient errors
        setUser((prev) => prev)
      }
    } catch {
      // Network error — retry if under max
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        setTimeout(() => fetchUser(), RETRY_DELAY_MS * retryCountRef.current)
        return
      }
      setIsLoading(false)
    } finally {
      if (retryCountRef.current === 0) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])



  const logout = async () => {
    try {
      await fetch("/api/v2/auth/logout", { method: "POST" })
      setUser(null)
      setStats(null)
      setFiles([])
      setCdnAssets([])
      setCdnFolders([])
      localStorage.removeItem("hpsk_e2e_master")
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, stats, files, folders, cdnAssets, cdnFolders, setFiles, setFolders, setCdnAssets, setCdnFolders, isLoading, isAuthenticated: !!user, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
