"use client"

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react"
import { apiFetch } from "@/lib/fetch"

interface AuthContextType {
  userId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 800

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const retryCountRef = useRef(0)

  const fetchAuth = useCallback(async () => {
    try {
      const response = await apiFetch("/api/v2/auth/me", {
        credentials: "include",
      })

      if (response.status === 429) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          setTimeout(() => fetchAuth(), RETRY_DELAY_MS * retryCountRef.current)
          return
        }
        setIsLoading(false)
        return
      }

      retryCountRef.current = 0

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          setUserId(data.userId)
        } else {
          setUserId(null)
        }
      } else if (response.status === 401) {
        setUserId(null)
      }
    } catch {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        setTimeout(() => fetchAuth(), RETRY_DELAY_MS * retryCountRef.current)
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
    fetchAuth()
  }, [fetchAuth])

  const logout = async () => {
    try {
      await apiFetch("/api/v2/auth/logout", { method: "POST" })
      setUserId(null)
      localStorage.removeItem("hpsk_e2e_master")
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ userId, isLoading, isAuthenticated: !!userId, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    return {
      userId: null,
      isLoading: false,
      isAuthenticated: false,
      logout: async () => {},
    }
  }
  return context
}
