"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Card, Typography } from "@heroui/react"
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
            className={`fixed z-[201] bottom-4 left-4 right-4 w-auto sm:left-auto sm:bottom-4 sm:w-[360px] pointer-events-auto ${desktopPosition}`}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)" }}
          >
            <Card
              variant="transparent"
              className="!p-0 !gap-0 overflow-hidden rounded-[16px] border !border-solid border-white/10 bg-overlay"
            >
              <Card.Header className="flex-row items-start justify-between gap-3 px-3 pt-3 pb-2">
                <div className="min-w-0">
                  <Card.Title className="text-base">Continue upload?</Card.Title>
                  <Card.Description>
                    You have an unfinished upload from a previous session. Resume it where you left off?
                  </Card.Description>
                </div>
                <Button
                  variant="ghost"
                  isIconOnly
                  size="sm"
                  onPress={() => setShowResumePopup(false)}
                  aria-label="Dismiss"
                >
                  <MIcon name="close" size={16} />
                </Button>
              </Card.Header>

              <Card.Content className="px-3 pb-3">
                <Card variant="transparent" className="!p-2.5 bg-surface rounded-[10px]">
                  <div className="flex items-center gap-2.5">
                    <MIcon name="description" size={14} className="shrink-0 text-muted" />
                    <Typography type="body-sm" className="min-w-0 truncate text-foreground">
                      {interruptedSession.fileName} · {(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB
                    </Typography>
                  </div>
                </Card>
              </Card.Content>

              <Card.Footer className="gap-2 px-3 pb-3">
                <Button variant="tertiary" onPress={handleAbortUpload} className="flex-1" style={{ gap: 8 }}>
                  <MIcon name="delete_outline" size={16} />
                  Cancel upload
                </Button>
                <Button variant="primary" onPress={handleResumeUpload} className="flex-1" style={{ gap: 8 }}>
                  <MIcon name="play_arrow" size={16} />
                  Resume
                </Button>
              </Card.Footer>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
