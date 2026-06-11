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
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              className="fixed z-[201] bottom-4 left-4 right-4 sm:left-auto sm:bottom-4 sm:right-[512px] w-auto sm:w-[380px] pointer-events-auto overflow-hidden bg-[#ffffff] dark:bg-[#1c1c1c]"
              style={{
                borderRadius: 6,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.10)',
                padding: 4,
              }}
            >
              {/* Title + description */}
              <div style={{ padding: '12px 12px 8px 12px' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    Continue upload?
                  </p>
                  <button onClick={() => setShowResumePopup(false)} className="text-[#999] hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors">
                    <MIcon name="close" size={16} />
                  </button>
                </div>
                <p className="text-[#888] dark:text-[#a1a1aa]" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4 }}>
                  You have an unfinished upload from a previous session. Would you like to resume it where you left off?
                </p>
              </div>

              {/* File list */}
              <div
                className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ borderRadius: 6, margin: '0 0 4px 0', padding: 4, maxHeight: 140, overflowY: 'auto' }}
              >
                <div className="flex items-center gap-2.5" style={{ height: 32, paddingLeft: 10, paddingRight: 10, borderRadius: 6 }}>
                  <MIcon name="description" size={14} className="text-[#999] dark:text-[#a1a1aa]" style={{ flexShrink: 0 }} />
                  <span className="text-[#333] dark:text-[#ccc]" style={{ fontSize: 13, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {interruptedSession.fileName} · {(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 6, padding: 4 }}>
                <button
                  onClick={handleResumeUpload}
                  className="w-full flex items-center gap-3 hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-75 text-[#111] dark:text-[#f0f0f0]"
                  style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 14, fontWeight: 400 }}
                >
                  <MIcon name="play_arrow" size={15} />
                  Resume Upload
                </button>
                <button
                  onClick={handleAbortUpload}
                  className="w-full flex items-center gap-3 hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-75 text-[#333] dark:text-[#ccc]"
                  style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 14, fontWeight: 400 }}
                >
                  <MIcon name="delete_outline" size={15} className="text-[#999] dark:text-[#a1a1aa]" />
                  Cancel Upload
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
