"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, useSpring } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { TextInput } from "@/components/ui/text-input"
import { ShineButton } from "@/components/ui/shine-button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { Slider } from "@/components/ui/slider"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { AlertMessage } from "@/components/ui/alert-message"
import { Loader } from "@/components/ui/loader"
import { SURFACE } from "@/components/ui/surface"
import Turnstile from "react-turnstile"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { EXPIRATION_STEPS } from "@/constants/upload"
import { useTheme } from "@/hooks/useTheme"
import { formatFileSize } from "./utils"
import type { UseUploadReturn } from "./use-upload"

const TurnstileWithRef = Turnstile as React.ComponentType<
  React.ComponentProps<typeof Turnstile> & { ref?: React.RefObject<{ reset(): void }> }
>

// One horizontal gutter for every row. No nested cards and no inner rules —
// the shell is the only surface, matching the sidebar usage card.
const PAD = "px-3"
const RULE = "border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]"
const LABEL = "text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]"
const MUTED = "text-[12px] text-[#6b6b70] dark:text-[#a8a8a8]"
const SECTION = "text-[11px] font-semibold uppercase tracking-wide text-[#8b8b90] dark:text-[#9a9aa0]"
const ICON = "text-[#8b8b90] dark:text-[#9a9aa0]"
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
  const showOptions = state === "selected"

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
      ? "Zipping your files, one moment…"
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
          className={`fixed bottom-0 left-0 right-0 z-40 mb-8 flex max-h-[80dvh] w-full flex-col overflow-hidden font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:mb-0 sm:max-h-[88dvh] sm:w-[470px] sm:max-w-[calc(100vw_-_2rem)] rounded-t-[16px] sm:rounded-[16px] ${SURFACE.panel}`}
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)" }}
        >
          {/* ── Header ── */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-3 pt-3 pb-2">
            <div className="flex min-w-0 flex-col">
              <h3 className="text-[15px] font-semibold tracking-tight text-[#111] dark:text-[#f0f0f0]" style={TITLE_FONT}>
                Uploads
              </h3>
              <p className="text-[12px] text-[#8b8b90] dark:text-[#8f8f95]">
                {files.length} item{files.length !== 1 ? "s" : ""} · {uploadType === "cdn" ? "CDN" : "Files"}
              </p>
            </div>
            <SecondaryButton
              variant="ghost"
              iconOnly
              size="sm"
              onClick={() => setTrayCollapsed((v) => !v)}
              aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
            >
              <MIcon name={trayCollapsed ? "expand_less" : "expand_more"} size={18} />
            </SecondaryButton>
          </div>

          {!trayCollapsed && (
            <>
              <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
                {uploadType !== "cdn" && state === "done" && shareUrl && shareUrl.includes("\n") && (
                  <div className="px-3 pb-2">
                    <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                      <span className="flex flex-col leading-snug">
                        <span className="font-semibold">Copy your links now</span>
                        <span className="opacity-80">
                          If you don&apos;t copy them, every file you shared becomes unrecoverable.
                        </span>
                      </span>
                    </AlertMessage>
                  </div>
                )}

                {state === "zipping" && (
                  <div className="px-3 pb-2">
                    <TrayFileRow name={`Zipping ${files.length} items…`} status="Compressing…" uploading progressPct={zipProgress} />
                  </div>
                )}

                {showList && (
                  <div className="flex flex-col gap-1.5 px-3 pb-2">
                    {zippedFile ? (
                      <TrayFileRow
                        size={zippedFile.size}
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
                        uploading={state === "uploading"}
                        progressPct={progress}
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
                            size={f.file.size}
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
                            uploading={current}
                            progressPct={current ? progress : null}
                            showCopy={state === "done"}
                            copied={copiedIndex === index}
                            onCopy={() => handleCopyOne(index)}
                            error={state === "error" && index === uploadingIndex}
                          />
                        )
                      })
                    )}
                  </div>
                )}

                {/* ── Options (Files) ── */}
                {showOptions && uploadType !== "cdn" && (
                  <div>
                    <div className={`${PAD} pt-3 pb-1`}>
                      <span className={SECTION}>Options</span>
                    </div>

                    <ToggleRow
                      icon="local_fire_department"
                      label="Burn after download"
                      on={burnOnRead}
                      onToggle={() => setBurnOnRead(!burnOnRead)}
                    />

                    {/* Custom expiration (Essential plan and above) */}
                    <div className={`${PAD} py-3`}>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <span className={`flex items-center gap-2.5 ${LABEL}`}>
                          <MIcon name="schedule" size={17} className={ICON} />
                          Expires after
                        </span>
                        {slugLocked ? <LockBadge /> : (
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
                        <div className="mt-1.5 flex justify-between text-[11px] text-[#8b8b90] dark:text-[#9a9aa0]">
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
                          <NoCustomLinkNote text="Custom links aren't available when uploading files separately. Zip them into one archive to use one." />
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

                {/* ── Options (CDN) ── */}
                {showOptions && uploadType === "cdn" && (
                  <div>
                    <div className={`${PAD} pt-3 pb-1`}>
                      <span className={SECTION}>Options</span>
                    </div>
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
                      <NoCustomLinkNote text="Custom links aren't available for multi-file uploads. Upload a single asset to use one." />
                    )}
                  </div>
                )}

                {showOptions && process.env.NODE_ENV !== "development" && (
                  <div className={`${PAD} flex justify-center py-3`}>
                    <TurnstileWithRef
                      ref={turnstileRef}
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                      onVerify={(token) => { setTurnstileToken(token); setTurnstileReady(true) }}
                      onExpire={() => { setTurnstileToken(""); setTurnstileReady(false) }}
                      theme={resolvedTheme}
                    />
                  </div>
                )}

                {normalizeTier(user?.tier) !== "ultimate" && (
                  <div className={`${PAD} pb-3 pt-2`}>
                    <p className="text-[11px] text-[#8b8b90] dark:text-[#9a9aa0]">
                      Want faster uploads and deletes?{" "}
                      <a href="/pricing" className="underline hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors">
                        Upgrade your plan
                      </a>
                      .
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className={`shrink-0 ${RULE} px-3 py-2.5`}>
                <div className="mb-2.5 flex items-center gap-2 px-0.5">
                  {(state === "uploading" || state === "zipping") && (
                    <span className="shrink-0 text-[#8b8b90] dark:text-[#8f8f95]">
                      <Loader size={18} />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold leading-none text-[#111] dark:text-[#ededed]">{footerTitle}</span>
                    <span className="line-clamp-1 text-[12px] leading-none text-[#8b8b90] dark:text-[#8f8f95]">{footerSub}</span>
                  </div>
                </div>

                {state === "selected" ? (
                  <div className="flex items-center justify-between gap-2">
                    <SecondaryButton size="sm" onClick={handleReset}>
                      Cancel
                    </SecondaryButton>
                    <ShineButton
                      size="sm"
                      onClick={handleUpload}
                      disabled={isUploading || (!turnstileReady && process.env.NODE_ENV !== "development")}
                      style={{ gap: 8 }}
                    >
                      <MIcon name="arrow_upward" size={16} />
                      Start
                    </ShineButton>
                  </div>
                ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                  <div className="flex items-center justify-between gap-2">
                    <SecondaryButton size="sm" onClick={handleReset}>
                      Done
                    </SecondaryButton>
                    <ShineButton
                      size="sm"
                      onClick={handleCopy}
                      color={copied ? "#059669" : undefined}
                      hoverColor={copied ? "#047857" : undefined}
                      style={{ gap: 8 }}
                    >
                      <MIcon name={copied ? "check" : "content_copy"} size={16} />
                      {copied ? "Copied" : "Copy all"}
                    </ShineButton>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <SecondaryButton size="sm" onClick={handleReset}>
                      Clear
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                      style={{ gap: 8 }}
                    >
                      <MIcon name="add" size={16} />
                      Add more
                    </SecondaryButton>
                  </div>
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

// Single file/archive line: name, badge, status-or-progress, optional copy chip.
// XHR reports real upload progress, but it fires in coarse jumps — a quick file
// can go straight from 0 to 100. Ease between the values it does report so the
// ring and the number travel instead of teleporting. The target is always the
// real percentage; only the path to it is interpolated.
function useSmoothPercent(target: number) {
  const spring = useSpring(target, { stiffness: 90, damping: 20, mass: 0.5 })
  const [shown, setShown] = useState(target)

  useEffect(() => { spring.set(target) }, [spring, target])
  useEffect(() => spring.on("change", (v) => setShown(v)), [spring])

  return shown
}

// Ring that fills as the upload runs, shown beside the percentage.
function CircleProgress({ value, size = 16 }: { value: number; size?: number }) {
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} opacity={0.22} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, value)) / 100)}
      />
    </svg>
  )
}

function TrayFileRow({
  name,
  status,
  size,
  uploading = false,
  progressPct = null,
  showCopy = false,
  copied = false,
  onCopy,
  error = false,
}: {
  name: string
  status: string
  size?: number
  /** Drives the ring + percentage. Only true for the file actually in flight. */
  uploading?: boolean
  progressPct?: number | null
  showCopy?: boolean
  copied?: boolean
  onCopy?: () => void
  error?: boolean
}) {
  const smooth = useSmoothPercent(progressPct ?? 0)
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 rounded-[10px] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)] bg-black/[0.02] dark:bg-white/[0.02] px-3"
      style={{ height: 38 }}
    >
      <MIcon name="attach_file" size={17} className="shrink-0 text-[#8b8b90] dark:text-[#8f8f95]" />

      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-[#111] dark:text-[#ededed]">
        {name}
      </p>

      <div className="flex shrink-0 items-center gap-2 text-[12px] tabular-nums text-[#8b8b90] dark:text-[#8f8f95]">
        {error ? (
          <span className="text-red-500 dark:text-red-400">{status}</span>
        ) : (
          <>
            {uploading && (
              <>
                <span>{Math.round(smooth)}%</span>
                <CircleProgress value={smooth} size={14} />
              </>
            )}
            {size !== undefined && <span>{formatFileSize(size)}</span>}
          </>
        )}
        {showCopy && onCopy && (
          <SecondaryButton
            size="xs"
            onClick={(e) => { e.stopPropagation(); onCopy() }}
            style={{ height: 24, fontSize: 11, paddingLeft: 8, paddingRight: 8, borderRadius: 7 }}
          >
            {copied ? "Copied" : "Copy link"}
          </SecondaryButton>
        )}
      </div>
    </div>
  )
}

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
    <div className={`${PAD} py-3`}>
      <div className="flex cursor-pointer items-center justify-between gap-3" onClick={onToggle}>
        <span className={`flex items-center gap-2.5 ${LABEL}`}>
          <MIcon name={icon} size={17} className={ICON} />
          {label}
        </span>
        <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
          <ToggleSwitch checked={on} onChange={onToggle} width={36} height={20} aria-label={label} />
        </span>
      </div>
      {sub && <p className={`mt-1.5 leading-snug ${MUTED}`}>{sub}</p>}
    </div>
  )
}

// Labelled field block (icon + label above a control).
function FieldBlock({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className={`${PAD} py-3`}>
      <div className={`mb-2.5 flex items-center gap-2.5 ${LABEL}`}>
        <MIcon name={icon} size={17} className={ICON} />
        {label}
      </div>
      {children}
    </div>
  )
}

function LockBadge() {
  return (
    <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b8b90] dark:text-[#9a9aa0]">
      <MIcon name="lock" size={12} /> Essential+
    </span>
  )
}

function UpgradeLink({ text }: { text: string }) {
  return (
    <a href="/pricing" className="mt-2 inline-block text-[11px] text-[#8b8b90] dark:text-[#9a9aa0] underline hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors">
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
    <div className={`${PAD} py-3`}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className={`flex items-center gap-2.5 ${LABEL}`}>
          <MIcon name="link" size={17} className={ICON} />
          Custom link
        </span>
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
          <p className="text-[11px] text-red-500">{slugError.message}</p>
          {slugError.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {slugError.suggestions.map((s) => (
                <SecondaryButton
                  key={s}
                  size="xs"
                  onClick={() => { setCustomSlug(s); setSlugError(null) }}
                >
                  {s}
                </SecondaryButton>
              ))}
            </div>
          )}
        </div>
      ) : (
        customSlug.trim() && (
          <p className="mt-2 truncate text-[11px] text-[#8b8b90] dark:text-[#9a9aa0]">
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
    <div className={`${PAD} py-3`}>
      <div className="flex items-start gap-2.5">
        <MIcon name="info" size={16} className={`mt-px shrink-0 ${ICON}`} />
        <p className={`leading-snug ${MUTED}`}>{text}</p>
      </div>
    </div>
  )
}
