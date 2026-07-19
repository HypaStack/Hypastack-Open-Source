"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { MenuItem } from "@/components/ui/menu-item"
import type { UseUploadReturn } from "./use-upload"

type ResumePopupProps = Pick<
  UseUploadReturn,
  "showResumePopup" | "setShowResumePopup" | "interruptedSession" | "resumeInputRef" | "handleAbortUpload" | "handleResumeUpload" | "handleResumeFileSelected" | "state"
>

export function ResumePopup({
  showResumePopup,
  setShowResumePopup,
  interruptedSession,
  resumeInputRef,
  handleAbortUpload,
  handleResumeUpload,
  handleResumeFileSelected,
  state,
}: ResumePopupProps) {
  // When an upload tray is visible (state !== "idle") sit just to the LEFT of
  // the bottom-right tray so they don't overlap. Otherwise occupy the tray's
  // own bottom-right slot, where the upload zone lives.
  const trayVisible = state !== "idle"
  const desktopPosition = trayVisible ? "sm:right-[500px]" : "sm:right-4"

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
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className={`fixed z-[201] bottom-4 left-4 right-4 w-auto sm:left-auto sm:bottom-4 sm:w-[360px] pointer-events-auto overflow-hidden bg-[#0f0f11] border border-[rgba(255,255,255,0.08)] rounded-[16px] ${desktopPosition}`}
            style={{
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
              padding: 6,
            }}
          >
            {/* Title + description */}
            <div style={{ padding: "10px 14px 6px 14px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                <p className="text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  Continue upload?
                </p>
                <SecondaryButton
                  variant="ghost"
                  iconOnly
                  size="xs"
                  onClick={() => setShowResumePopup(false)}
                  aria-label="Dismiss"
                  style={{ height: 24, width: 24, borderRadius: 6 }}
                >
                  <MIcon name="close" size={16} />
                </SecondaryButton>
              </div>
              <p className="text-[#898e97]" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4 }}>
                You have an unfinished upload from a previous session. Resume it where you left off?
              </p>
            </div>

            {/* File */}
            <div
              className="bg-[rgba(255,255,255,0.04)] rounded-[10px] border border-[rgba(255,255,255,0.06)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{ margin: "0 0 6px 0", padding: 4, maxHeight: 140, overflowY: "auto" }}
            >
              <div className="flex items-center gap-2.5" style={{ height: 32, paddingLeft: 10, paddingRight: 10, borderRadius: 6 }}>
                <MIcon name="description" size={14} className="text-[#a1a1aa]" style={{ flexShrink: 0 }} />
                <span className="text-[#ccc]" style={{ fontSize: 13, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {interruptedSession.fileName} · {(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#0f0f11] rounded-[10px] border border-[rgba(255,255,255,0.06)]" style={{ padding: 4 }}>
              <MenuItem
                theme="dark"
                onClick={handleResumeUpload}
                icon={<MIcon name="play_arrow" size={15} />}
                style={{ height: 36, borderRadius: 8, paddingLeft: 12, paddingRight: 12 }}
              >
                Resume upload
              </MenuItem>
              <MenuItem
                theme="dark"
                onClick={handleAbortUpload}
                icon={<MIcon name="delete_outline" size={15} />}
                style={{ height: 36, borderRadius: 8, paddingLeft: 12, paddingRight: 12, fontWeight: 400 }}
              >
                Cancel upload
              </MenuItem>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
