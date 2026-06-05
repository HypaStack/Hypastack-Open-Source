"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import type { UseUploadReturn } from "./use-upload"

type ResumePopupProps = Pick<
  UseUploadReturn,
  "showResumePopup" | "setShowResumePopup" | "interruptedSession" | "resumeInputRef" | "handleAbortUpload" | "handleResumeUpload" | "handleResumeFileSelected"
>

export function ResumePopup({
  showResumePopup,
  setShowResumePopup,
  interruptedSession,
  resumeInputRef,
  handleAbortUpload,
  handleResumeUpload,
  handleResumeFileSelected,
}: ResumePopupProps) {
  return (
    <>
      <input
        ref={resumeInputRef}
        type="file"
        className="hidden"
        onChange={handleResumeFileSelected}
      />

      <AnimatePresence>
        {showResumePopup && interruptedSession && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowResumePopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[420px] rounded-[20px]"
              style={{
                backgroundColor: "#1f1f1f",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)",
                padding: 3,
              }}
            >
              <div className="p-6 rounded-[17px]" style={{ backgroundColor: "#111111" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MIcon name="cloud_upload" size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-foreground">
                      Do you want to continue the previous upload where you left off?
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      The file is waiting to be completed or cancelled.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/50 px-4 py-3 mb-5">
                  <p className="text-[13px] text-muted-foreground font-medium truncate">
                    {interruptedSession.fileName}
                  </p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    {(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB · {interruptedSession.totalParts} chunks
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAbortUpload}
                    className="flex-1 px-4 py-2.5 rounded-[16px] bg-[#1f1f1f] hover:bg-[#1a1a1a] text-[14px] font-semibold text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResumeUpload}
                    className="flex-1 px-4 py-2.5 rounded-[16px] bg-white text-black text-[14px] font-semibold hover:bg-[#e2e2e8] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
