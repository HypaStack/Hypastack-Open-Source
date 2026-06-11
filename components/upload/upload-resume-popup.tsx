"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import type { InterruptedSession } from "./upload-types"

interface UploadResumePopupProps {
  show: boolean
  session: InterruptedSession | null
  onClose: () => void
  onAbort: () => void
  onResume: () => void
}

export function UploadResumePopup({
  show,
  session,
  onClose,
  onAbort,
  onResume,
}: UploadResumePopupProps) {
  return (
    <AnimatePresence>
      {show && session && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[420px] rounded-md overflow-hidden"
            style={{ backgroundColor: '#1f1f1f', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MIcon name="cloud_upload" className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-foreground">
                    Want to continue your upload?
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Some chunks were already uploaded
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-secondary/50 px-4 py-3 mb-5">
                <p className="text-[13px] text-muted-foreground font-medium truncate">
                  {session.fileName}
                </p>
                <p className="text-[12px] text-muted-foreground/70 mt-1">
                  {(session.fileSize / 1024 / 1024).toFixed(1)} MB · {session.totalParts} chunks
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onAbort}
                  className="flex-1 px-4 py-2.5 rounded-md bg-[#171717] hover:bg-[#313131] text-[14px] font-semibold text-foreground transition-colors"
                >
                  Abort
                </button>
                <button
                  type="button"
                  onClick={onResume}
                  className="flex-1 px-4 py-2.5 rounded-md bg-white text-black text-[14px] font-semibold hover:bg-[#e2e2e8] transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
