"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { TextInput } from "@/components/ui/text-input"
import { ShineButton } from "@/components/ui/shine-button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { Slider } from "@/components/ui/slider"
import { ProgressBar } from "@/components/ui/progress-bar"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { AlertMessage } from "@/components/ui/alert-message"
import { Loader } from "@/components/ui/loader"
import Turnstile from "react-turnstile"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { EXPIRATION_STEPS } from "@/constants/upload"
import { useTheme } from "@/hooks/useTheme"
import { formatFileSize } from "./utils"
import type { UseUploadReturn } from "./use-upload"

const TurnstileWithRef = Turnstile as React.ComponentType<
  React.ComponentProps<typeof Turnstile> & { ref?: React.RefObject<{ reset(): void }> }
>

// Shared surface token — every section in the tray is one of these cards, spaced
// 6px apart inside the shell. Matches the hypa-notif card system.
const CARD =
  "bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.035)] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] rounded-[12px]"
const DIVIDE = "divide-y divide-[rgba(0,0,0,0.05)] dark:divide-[rgba(255,255,255,0.05)]"
const TITLE_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }

type UploadTrayProps = UseUploadReturn

export function UploadTray({
  state,
  files,
  progress,
  copied,
  copiedIndex,
  shareUrl,
  errorMessage,
  isUploading,
  burnOnRead,
  setBurnOnRead,
  turnstileToken,
  setTurnstileToken,
  turnstileReady,
  setTurnstileReady,
  zipProgress,
  customFilename,
  setCustomFilename,
  customSlug,
  setCustomSlug,
  slugError,
  setSlugError,
  expirationMinutes,
  setExpirationMinutes,
  zippedFile,
  note,
  setNote,
  zipMultipleFiles,
  setZipMultipleFiles,
  trayCollapsed,
  setTrayCollapsed,
  uploadingIndex,
  isMultiFile,
  turnstileRef,
  inputRef,
  handleUpload,
  handleCopy,
  handleCopyOne,
  handleReset,
  getUploadStats,
  user,
  uploadType,
}: UploadTrayProps) {
  const { resolvedTheme } = useTheme()
  // Render into <body> so `position: fixed` is anchored to the viewport. The
  // dashboard's <main> keeps a `filter` at rest, which would otherwise make it
  // the containing block for the fixed tray (breaking the height cap + scroll).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const trayVisible = state !== "idle"
  // Free users still SEE the custom-link / expiration controls (so they know
  // the features exist) but the inputs are locked. The server is the real gate.
  const slugLocked = !isPaidTier(normalizeTier(user?.tier))
  const expIndex = Math.max(0, EXPIRATION_STEPS.findIndex((s) => s.minutes === expirationMinutes))
  const currentExpLabel = EXPIRATION_STEPS[expIndex]?.label ?? EXPIRATION_STEPS[EXPIRATION_STEPS.length - 1].label
  const showList = state === "selected" || state === "uploading" || state === "done" || state === "error"

  const footerTitle =
    state === "done"
      ? "Upload complete"
      : state === "uploading"
      ? `Uploading ${Math.min(uploadingIndex + 1, files.length)} of ${files.length}`
      : state === "error"
      ? "Upload failed"
      : state === "zipping"
      ? "Preparing upload"
      : `Ready to upload ${files.length} item${files.length !== 1 ? "s" : ""}`
  const footerSub =
    state === "done"
      ? "All files uploaded"
      : state === "uploading"
      ? getUploadStats()
      : state === "error"
      ? errorMessage
      : state === "zipping"
      ? "Zipping your files — one moment…"
      : "Press Start to begin"

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {trayVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(12px)" }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
            mass: 0.85,
            opacity: { duration: 0.25, ease: "easeOut" },
            filter: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed bottom-0 left-0 right-0 z-40 mb-8 flex max-h-[80dvh] w-full flex-col font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:mb-0 sm:max-h-[88dvh] sm:w-[420px] sm:max-w-[calc(100vw_-_2rem)] rounded-t-[18px] sm:rounded-[18px] bg-[#f7f7f8] dark:bg-[#171717] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] p-1.5"
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)" }}
        >
          {/* ── Header ── */}
          <div className="flex shrink-0 items-start justify-between px-2.5 pt-1.5 pb-2">
            <div className="flex min-w-0 flex-col">
              <h3 className="text-[15px] font-semibold tracking-tight text-[#111] dark:text-[#f0f0f0]" style={TITLE_FONT}>
                Uploads
              </h3>
              <p className="text-[12px] text-[#8b8b90] dark:text-[#8b9099]">
                {files.length} item{files.length !== 1 ? "s" : ""} · {uploadType === "cdn" ? "CDN" : "Files"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <SecondaryButton
                variant="ghost"
                size="xs"
                onClick={handleReset}
                style={{ height: 28, borderRadius: 9999 }}
              >
                Clear
              </SecondaryButton>
              <SecondaryButton
                variant="ghost"
                iconOnly
                size="xs"
                onClick={() => setTrayCollapsed((v) => !v)}
                aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
                style={{ height: 28, width: 28, borderRadius: 9999 }}
              >
                <MIcon name={trayCollapsed ? "expand_less" : "expand_more"} size={18} />
              </SecondaryButton>
            </div>
          </div>

          {!trayCollapsed && (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-0.5 [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Copy-all warning (multi-link files upload) */}
                {uploadType !== "cdn" && state === "done" && shareUrl && shareUrl.includes("\n") && (
                  <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                    <span className="flex flex-col leading-snug">
                      <span className="font-semibold">Copy your links now</span>
                      <span className="opacity-80">
                        If you don&apos;t copy them, every file you shared becomes unrecoverable.
                      </span>
                    </span>
                  </AlertMessage>
                )}

                {/* Zipping */}
                {state === "zipping" && (
                  <div className={CARD}>
                    <TrayFileRow
                      badge="ZIP"
                      name={`Zipping ${files.length} items…`}
                      status="Compressing…"
                      progressPct={zipProgress}
                    />
                  </div>
                )}

                {/* File list */}
                {showList && (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className={DIVIDE}>
                      {zippedFile ? (
                        <TrayFileRow
                          badge="ZIP"
                          name={zippedFile.name}
                          status={
                            state === "done"
                              ? `Uploaded · ${files.length} file${files.length !== 1 ? "s" : ""} archived`
                              : state === "error"
                              ? "Failed"
                              : state === "uploading"
                              ? "Uploading…"
                              : "Pending"
                          }
                          progressPct={state === "uploading" ? progress : null}
                          showCopy={state === "done"}
                          copied={copied}
                          onCopy={handleCopy}
                          error={state === "error"}
                        />
                      ) : (
                        files.map((f, index) => {
                          const done = state === "uploading" ? index < uploadingIndex : false
                          const current = state === "uploading" && index === uploadingIndex
                          return (
                            <TrayFileRow
                              key={f.id}
                              badge={f.file.name.split(".").pop()?.substring(0, 4) || "FILE"}
                              name={f.path || f.file.name}
                              status={
                                state === "done"
                                  ? "Uploaded"
                                  : state === "error"
                                  ? index < uploadingIndex
                                    ? "Uploaded"
                                    : index === uploadingIndex
                                    ? "Failed"
                                    : "Skipped"
                                  : state === "uploading"
                                  ? done
                                    ? "Uploaded"
                                    : current
                                    ? "Uploading…"
                                    : "Pending"
                                  : "Pending"
                              }
                              progressPct={
                                state === "selected" || state === "uploading"
                                  ? state === "uploading"
                                    ? done
                                      ? 100
                                      : current
                                      ? progress
                                      : 0
                                    : 0
                                  : null
                              }
                              showCopy={state === "done"}
                              copied={copiedIndex === index}
                              onCopy={() => handleCopyOne(index)}
                              error={state === "error" && index === uploadingIndex}
                            />
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Options (Files) */}
                {state === "selected" && uploadType !== "cdn" && (
                  <div className={`${CARD} ${DIVIDE} overflow-hidden`}>
                    <ToggleRow
                      icon="local_fire_department"
                      label="Burn after download"
                      on={burnOnRead}
                      onToggle={() => setBurnOnRead(!burnOnRead)}
                    />

                    {/* Custom expiration (Essential plan and above) */}
                    <div className="px-3.5 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <MIcon name="schedule" size={16} className="text-[#8b8b90] dark:text-[#8b9099]" />
                          <span className="text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]">Expires after</span>
                        </div>
                        {slugLocked ? (
                          <LockBadge />
                        ) : (
                          <span className="text-[12px] font-semibold text-[#111] dark:text-[#f0f0f0]">{currentExpLabel}</span>
                        )}
                      </div>
                      <Slider
                        min={0}
                        max={EXPIRATION_STEPS.length - 1}
                        step={1}
                        value={slugLocked ? EXPIRATION_STEPS.length - 1 : expIndex}
                        onChange={(v) => { if (!slugLocked) setExpirationMinutes(EXPIRATION_STEPS[v].minutes) }}
                        disabled={slugLocked}
                        aria-label="Expires after"
                      />
                      {slugLocked ? (
                        <UpgradeLink text="Upgrade to choose a custom expiry" />
                      ) : (
                        <div className="mt-1 flex justify-between text-[10px] text-[#9a9aa0] dark:text-[#6b6b6b]">
                          <span>1 min</span>
                          <span>30 days</span>
                        </div>
                      )}
                    </div>

                    {isMultiFile ? (
                      <>
                        <ToggleRow
                          icon="folder_zip"
                          label="Zip the files"
                          on={zipMultipleFiles}
                          onToggle={() => setZipMultipleFiles(!zipMultipleFiles)}
                          sub="Uploading multiple files in a ZIP counts as 1 file."
                        />
                        {zipMultipleFiles ? (
                          <>
                            <FieldBlock icon="folder_zip" label="Archive name">
                              <TextInput
                                type="text"
                                size="md"
                                fullWidth
                                value={customFilename}
                                onChange={(e) => setCustomFilename(e.target.value)}
                                placeholder="hypastack-archive"
                              />
                            </FieldBlock>
                            {/* Zipped = one share link, so a custom link applies */}
                            <CustomLinkField
                              slugLocked={slugLocked}
                              customSlug={customSlug}
                              setCustomSlug={setCustomSlug}
                              slugError={slugError}
                              setSlugError={setSlugError}
                              prefix="/d/"
                              placeholder="my-archive"
                              previewBase="hypastack.com/d/"
                            />
                          </>
                        ) : (
                          <NoCustomLinkNote text="Custom links aren't available when uploading files separately — zip them into one archive to use one." />
                        )}
                      </>
                    ) : (
                      <>
                        <FieldBlock icon="edit" label="Rename file">
                          <TextInput
                            type="text"
                            size="md"
                            fullWidth
                            value={customFilename}
                            onChange={(e) => setCustomFilename(e.target.value)}
                            placeholder={files[0]?.file.name || "example.pdf"}
                          />
                        </FieldBlock>
                        {/* Custom link (Essential plan and above) */}
                        <CustomLinkField
                          slugLocked={slugLocked}
                          customSlug={customSlug}
                          setCustomSlug={setCustomSlug}
                          slugError={slugError}
                          setSlugError={setSlugError}
                          prefix="/d/"
                          placeholder="my-custom-file"
                          previewBase="hypastack.com/d/"
                        />
                      </>
                    )}

                    <FieldBlock icon="article" label="Note">
                      <TextInput
                        multiline
                        rows={2}
                        size="md"
                        fullWidth
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional message…"
                        maxLength={100}
                      />
                    </FieldBlock>
                  </div>
                )}

                {/* Options (CDN) */}
                {state === "selected" && uploadType === "cdn" && (
                  <div className={`${CARD} overflow-hidden`}>
                    {files.length === 1 ? (
                      <CustomLinkField
                        slugLocked={slugLocked}
                        customSlug={customSlug}
                        setCustomSlug={setCustomSlug}
                        slugError={slugError}
                        setSlugError={setSlugError}
                        prefix="cdn/"
                        placeholder="my-asset"
                        previewBase="r2.hypastack.com/cdn/"
                      />
                    ) : (
                      <NoCustomLinkNote text="Custom links aren't available for multi-file uploads — upload a single asset to use one." />
                    )}
                  </div>
                )}

                {/* Turnstile */}
                {state === "selected" && process.env.NODE_ENV !== "development" && (
                  <div className={`${CARD} flex justify-center px-3 py-3`}>
                    <TurnstileWithRef
                      ref={turnstileRef}
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                      onVerify={(token) => { setTurnstileToken(token); setTurnstileReady(true) }}
                      onExpire={() => { setTurnstileToken(""); setTurnstileReady(false) }}
                      theme={resolvedTheme}
                    />
                  </div>
                )}

                {/* Upgrade nudge */}
                {normalizeTier(user?.tier) !== "ultimate" && (
                  <p className="px-2.5 text-[11px] text-[#9a9aa0] dark:text-[#6b6b6b]">
                    Want faster uploads &amp; deletes?{" "}
                    <a href="/pricing" className="underline text-[#666] dark:text-[#8b9099] hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors">
                      Upgrade your plan
                    </a>
                    .
                  </p>
                )}
              </div>

              {/* ── Footer / action bar ── */}
              <div className="mt-1.5 shrink-0 rounded-[12px] bg-[#f2f2f4] dark:bg-[rgba(255,255,255,0.02)] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] p-2">
                <div className="flex items-center gap-3 px-1.5 pb-2.5 pt-1">
                  {(state === "uploading" || state === "zipping") && (
                    <span className="text-[#666] dark:text-[#8b9099]">
                      <Loader size={22} />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-semibold leading-tight text-[#111] dark:text-[#f0f0f0]">{footerTitle}</span>
                    <span className="line-clamp-2 text-[12px] text-[#8b8b90] dark:text-[#8b9099]">{footerSub}</span>
                  </div>
                </div>

                {state === "selected" ? (
                  <div className="flex items-center gap-1.5">
                    <SecondaryButton
                      size="sm"
                      onClick={handleReset}
                      className="flex-1"
                      style={{ height: 36, borderRadius: 9 }}
                    >
                      Cancel
                    </SecondaryButton>
                    <ShineButton
                      size="sm"
                      onClick={handleUpload}
                      disabled={isUploading || (!turnstileReady && process.env.NODE_ENV !== "development")}
                      className="flex-1"
                      style={{ height: 36, borderRadius: 9, gap: 6 }}
                    >
                      <MIcon name="arrow_upward" size={16} />
                      Start
                    </ShineButton>
                  </div>
                ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                  <ShineButton
                    size="sm"
                    fullWidth
                    onClick={handleCopy}
                    color={copied ? "#059669" : undefined}
                    hoverColor={copied ? "#047857" : undefined}
                    style={{ height: 36, borderRadius: 9, gap: 6 }}
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={16} />
                    {copied ? "Copied all links" : "Copy all links"}
                  </ShineButton>
                ) : (
                  <SecondaryButton
                    size="sm"
                    fullWidth
                    onClick={() => inputRef.current?.click()}
                    style={{ height: 36, borderRadius: 9, gap: 6 }}
                  >
                    <MIcon name="add" size={16} />
                    Add more
                  </SecondaryButton>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ── Presentational helpers ──

// Single file/archive line: badge, name, status-or-progress, optional copy chip.
function TrayFileRow({
  badge,
  name,
  status,
  progressPct = null,
  showCopy = false,
  copied = false,
  onCopy,
  error = false,
}: {
  badge: string
  name: string
  status: string
  progressPct?: number | null
  showCopy?: boolean
  copied?: boolean
  onCopy?: () => void
  error?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-medium leading-tight text-[#111] dark:text-[#f0f0f0]">{name}</p>
          <span className="shrink-0 rounded-[5px] bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#8b8b90] dark:text-[#8b9099]">
            {badge}
          </span>
        </div>
        {progressPct === null ? (
          <p className={`mt-0.5 text-[12px] ${error ? "text-red-500 dark:text-red-400" : "text-[#8b8b90] dark:text-[#8b9099]"}`}>{status}</p>
        ) : (
          <div className="mt-1.5">
            <Bar pct={progressPct} />
          </div>
        )}
      </div>
      {showCopy && onCopy && (
        <SecondaryButton
          size="xs"
          onClick={(e) => { e.stopPropagation(); onCopy() }}
          style={{ borderRadius: 9999 }}
        >
          {copied ? "Copied" : "Copy link"}
        </SecondaryButton>
      )}
    </div>
  )
}

// Shared shiny indigo progress bar — one treatment everywhere.
function Bar({ pct }: { pct: number }) {
  return <ProgressBar value={pct} height={4} aria-label="Upload progress" />
}

// Theme-aware toggle switch.
// Toggle row with icon + label (+ optional helper text).
function ToggleRow({
  icon,
  label,
  on,
  onToggle,
  sub,
}: {
  icon: string
  label: string
  on: boolean
  onToggle: () => void
  sub?: string
}) {
  return (
    <div>
      <div
        className="flex cursor-pointer items-center justify-between px-3.5 py-3 transition-colors duration-150 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5">
          <MIcon name={icon} size={17} className="text-[#8b8b90] dark:text-[#8b9099]" />
          <span className="text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]">{label}</span>
        </div>
        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
          <ToggleSwitch checked={on} onChange={onToggle} width={36} height={20} aria-label={label} />
        </span>
      </div>
      {sub && <p className="px-3.5 pb-3 -mt-1.5 text-[12px] leading-snug text-[#8b8b90] dark:text-[#8b9099]">{sub}</p>}
    </div>
  )
}

// Labelled field block (icon + label above a control).
function FieldBlock({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <MIcon name={icon} size={16} className="text-[#8b8b90] dark:text-[#8b9099]" />
        <span className="text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]">{label}</span>
      </div>
      {children}
    </div>
  )
}


function LockBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9a9aa0] dark:text-[#8b9099]">
      <MIcon name="lock" size={12} /> Essential+
    </span>
  )
}

function UpgradeLink({ text }: { text: string }) {
  return (
    <a href="/pricing" className="mt-1 inline-block text-[11px] text-[#8b8b90] dark:text-[#8b9099] underline hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors">
      {text}
    </a>
  )
}

// Shared custom-link (slug) field. Used for single files, zipped archives, and
// single CDN assets — anywhere the upload yields exactly one share link. Free
// users see it locked; the server is the real gate.
function CustomLinkField({
  slugLocked,
  customSlug,
  setCustomSlug,
  slugError,
  setSlugError,
  prefix,
  placeholder,
  previewBase,
}: {
  slugLocked: boolean
  customSlug: string
  setCustomSlug: (v: string) => void
  slugError: { message: string; suggestions: string[] } | null
  setSlugError: (v: { message: string; suggestions: string[] } | null) => void
  prefix: string
  placeholder: string
  previewBase: string
}) {
  return (
    <div className="px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MIcon name="link" size={16} className="text-[#8b8b90] dark:text-[#8b9099]" />
          <span className="text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]">Custom link</span>
        </div>
        {slugLocked && <LockBadge />}
      </div>
      <TextInput
        type="text"
        size="md"
        fullWidth
        value={slugLocked ? "" : customSlug}
        onChange={(e) => {
          if (slugLocked) return
          setCustomSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
          if (slugError) setSlugError(null)
        }}
        placeholder={slugLocked ? "available on paid plans" : placeholder}
        maxLength={64}
        disabled={slugLocked}
        leading={<span className="text-[13px]">{prefix}</span>}
      />
      {slugLocked ? (
        <UpgradeLink text="Upgrade to Essential to use custom links" />
      ) : slugError ? (
        <div className="mt-2">
          <p className="text-[11px] text-red-500" style={{ paddingLeft: 2 }}>{slugError.message}</p>
          {slugError.suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {slugError.suggestions.map((s) => (
                <SecondaryButton
                  key={s}
                  size="xs"
                  onClick={() => { setCustomSlug(s); setSlugError(null) }}
                  style={{ height: 24, padding: "0 8px", borderRadius: 6, fontSize: 11 }}
                >
                  {s}
                </SecondaryButton>
              ))}
            </div>
          )}
        </div>
      ) : (
        customSlug.trim() && (
          <p className="mt-1.5 truncate text-[11px] text-[#9a9aa0] dark:text-[#8b9099]" style={{ paddingLeft: 2 }}>
            {previewBase}{customSlug.trim()}
          </p>
        )
      )}
    </div>
  )
}

// Small inline note explaining a custom link can't be used for this upload.
function NoCustomLinkNote({ text }: { text: string }) {
  return (
    <div className="px-3.5 py-3">
      <div className="flex items-start gap-2">
        <MIcon name="info" size={14} className="mt-0.5 shrink-0 text-[#8b8b90] dark:text-[#8b9099]" />
        <p className="text-[12px] leading-snug text-[#8b8b90] dark:text-[#8b9099]">{text}</p>
      </div>
    </div>
  )
}
