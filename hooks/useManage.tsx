"use client"

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react"
import { getSessionKey, decryptE2E } from "@/lib/security/cryptoClient"
import { apiFetch } from "@/lib/http/fetch"

export type Tier = "free" | "essential" | "premium" | "ultimate"

interface User {
  id: string
  nickname: string
  avatarUrl: string | null
  bannerUrl: string | null
  displayName: string | null
  displayNameChangedAt: string | null
  nicknameChangedAt: string | null
  verified: boolean
  createdAt: string
  premium: boolean
  tier: Tier
  lastAcknowledgedTier: Tier
  inactivityPurgeDays: number
}

export interface StorageStats {
  totalStorage: number
  maxStorage: number
  storagePercent: number
  activeFiles?: number
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

interface ManageContextType {
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
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const ManageContext = createContext<ManageContextType | undefined>(undefined)

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 800

export function ManageProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [cdnAssets, setCdnAssets] = useState<CdnAssetItem[]>([])
  const [cdnFolders, setCdnFolders] = useState<CdnFolderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const retryCountRef = useRef(0)

  const fetchData = useCallback(async () => {
    try {
      const response = await apiFetch("/api/v2/auth/me?include=user,stats,files,cdn,folders", {
        credentials: "include",
      })

      if (response.status === 429) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          setTimeout(() => fetchData(), RETRY_DELAY_MS * retryCountRef.current)
          return
        }
        setIsLoading(false)
        return
      }

      retryCountRef.current = 0

      if (response.ok) {
        const data = await response.json()
        if (!data.authenticated) {
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
      }
    } catch {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        setTimeout(() => fetchData(), RETRY_DELAY_MS * retryCountRef.current)
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
    fetchData()
  }, [fetchData])

  const logout = async () => {
    try {
      await apiFetch("/api/v2/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      // never leave a stale master key behind, even if the request failed
      setUser(null)
      setStats(null)
      setFiles([])
      setCdnAssets([])
      setCdnFolders([])
      localStorage.removeItem("hpsk_e2e_master")
      window.location.href = "/"
    }
  }

  return (
    <ManageContext.Provider value={{ user, stats, files, folders, cdnAssets, cdnFolders, setFiles, setFolders, setCdnAssets, setCdnFolders, isLoading, logout, refreshUser: fetchData }}>
      {children}
    </ManageContext.Provider>
  )
}

export function useManage() {
  const context = useContext(ManageContext)
  if (context === undefined) {
    throw new Error("useManage must be used within a ManageProvider (only available under /manage/* routes)")
  }
  return context
}
