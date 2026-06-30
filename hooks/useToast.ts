"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "success" | "error"
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]))
}

export function addToast(toast: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2, 9)
  const newToast: Toast = { id, duration: 4000, ...toast }
  toasts = [...toasts.slice(-2), newToast]
  notifyListeners()

  setTimeout(() => {
    removeToast(id)
  }, newToast.duration)
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notifyListeners()
}

export function useToast(): ToastState {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const listener = (newToasts: Toast[]) => {
      if (mountedRef.current) {
        setLocalToasts(newToasts)
      }
    }
    toastListeners.push(listener)
    setLocalToasts([...toasts])
    return () => {
      mountedRef.current = false
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  return {
    toasts: localToasts,
    addToast,
    removeToast,
  }
}
