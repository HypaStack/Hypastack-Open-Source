"use client"

import { useToast } from "@/hooks/useToast"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto min-w-[280px] max-w-[380px] rounded-md overflow-hidden"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start gap-3 p-4">
              {toast.variant === "success" && (
                <MIcon name="check_circle" className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              )}
              {toast.variant === "error" && (
                <MIcon name="cancel" className="text-red-500 shrink-0 mt-0.5" size={20} />
              )}
              {(!toast.variant || toast.variant === "default") && (
                <div className="h-5 w-5 rounded-full bg-[#e5e5e5] shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#111]">{toast.title}</p>
                {toast.description && (
                  <p className="text-[13px] text-[#888] mt-0.5 leading-snug">{toast.description}</p>
                )}
              </div>
              <SecondaryButton
                variant="ghost"
                iconOnly
                size="xs"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
                style={{ height: 24, width: 24, borderRadius: 6 }}
              >
                <MIcon name="close" size={16} />
              </SecondaryButton>
            </div>
            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: (toast.duration ?? 4000) / 1000, ease: "linear" }}
              style={{ originX: 0 }}
              className={`h-0.5 ${toast.variant === "error" ? "bg-red-400" : "bg-[#171717]"}`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
