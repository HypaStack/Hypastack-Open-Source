"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useSpring } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Card, TextField, Input, TextArea, InputGroup, Switch, ProgressCircle, Table, Separator } from "@heroui/react"
import { toPressHandler } from "@/components/ui/button-press"
import { Slider } from "@/components/ui/slider"
import { AlertMessage } from "@/components/ui/alert-message"
import { Loader } from "@/components/ui/loader"
import { QrCodePopover } from "@/components/ui/qr-code-popover"
import { Tooltip } from "@/components/ui/tooltip"
import Turnstile from "react-turnstile"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { EXPIRATION_STEPS } from "@/constants/upload"
import { useTheme } from "@/hooks/useTheme"
import { formatBytes } from "@/lib/format"
import type { UseUploadReturn } from "./use-upload"

const TurnstileWithRef = Turnstile as React.ComponentType<
  React.ComponentProps<typeof Turnstile> & { ref?: React.RefObject<{ reset(): void }> }
>

// One horizontal gutter for every row. No nested cards and no inner rules,
// the shell is the only surface, matching the sidebar usage card.
const PAD = "px-3"
const LABEL = "text-[13px] font-medium text-foreground"
const MUTED = "text-[12px] text-muted"
const SECTION = "text-[15px] font-semibold text-foreground"
const ICON = "text-muted"

type UploadTrayProps = UseUploadReturn

export function UploadTray({
  state,
  files,
  copied,
  copiedIndex,
  shareUrl,
  shareUrls,
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
  doFullReset,
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
  // Rename/custom-link/note/expiry all sit behind their own toggle now,
  // collapsed by default so Options reads as a flat list of switches, and
  // only the ones actually turned on show their input underneath.
  const [renameOpen, setRenameOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [expiresOpen, setExpiresOpen] = useState(false)
  useEffect(() => {
    if (state === "selected") {
      setRenameOpen(false)
      setLinkOpen(false)
      setNoteOpen(false)
      setExpiresOpen(false)
    }
  }, [state])
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
          className="fixed bottom-0 left-0 right-0 z-40 mb-8 flex max-h-[88dvh] w-full flex-col font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:mb-0 sm:max-h-[94dvh] sm:w-[520px] sm:max-w-[calc(100vw_-_2rem)]"
        >
          <Card
            variant="transparent"
            className="!p-0 !gap-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[16px] border !border-solid border-white/10 bg-overlay sm:rounded-[16px]"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)" }}
          >
          {/* ── Header ── */}
          <Card.Header className="flex-row shrink-0 items-center justify-between gap-3 px-3 pt-3 pb-2">
            <div className="flex min-w-0 flex-col">
              <Card.Title className="text-lg">
                Selected {files.length} File{files.length !== 1 ? "s" : ""}
              </Card.Title>
            </div>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setTrayCollapsed((v) => !v)}
              aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
            >
              <MIcon name={trayCollapsed ? "expand_less" : "expand_more"} size={18} />
            </Button>
          </Card.Header>

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
                  <div className="px-3 pb-2">
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Files to upload">
                          <Table.Header>
                            <Table.Column isRowHeader className="py-1.5">Name</Table.Column>
                            <Table.Column className="py-1.5 text-right">Status</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {zippedFile ? (
                              <Table.Row id="zipped">
                                <Table.Cell className="py-1.5">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <MIcon name="folder_zip" size={15} className="shrink-0 text-muted" />
                                    <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                                      {zippedFile.name}
                                    </span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="py-1.5">
                                  <div className="flex items-center justify-end gap-2 text-[12px] tabular-nums text-muted">
                                    {state === "error" ? (
                                      <span className="text-danger">Failed</span>
                                    ) : state === "uploading" ? (
                                      <span>Uploading…</span>
                                    ) : state === "done" ? (
                                      <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {shareUrl && <QrCodePopover url={shareUrl} size={24} />}
                                        <Button
                                          variant="tertiary"
                                          size="sm"
                                          onPress={toPressHandler((e) => { e.stopPropagation(); handleCopy() })}
                                          style={{ height: 24, width: 76, fontSize: 11, justifyContent: "center" }}
                                        >
                                          {copied ? "Copied" : "Copy link"}
                                        </Button>
                                      </span>
                                    ) : (
                                      <span>Pending</span>
                                    )}
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              files.map((f, index) => {
                                // index < uploadingIndex always means that file finished before
                                // whatever's happening now, regardless of overall state, so an
                                // interrupted upload still shows earlier files as Uploaded, not Skipped.
                                const uploaded = state === "done" || index < uploadingIndex
                                const current = state === "uploading" && index === uploadingIndex
                                const failed = state === "error" && index === uploadingIndex
                                const skipped = state === "error" && index > uploadingIndex
                                const status = failed
                                  ? "Failed"
                                  : uploaded
                                  ? "Uploaded"
                                  : current
                                  ? "Uploading…"
                                  : skipped
                                  ? "Skipped"
                                  : "Pending"
                                return (
                                  <Table.Row key={f.id} id={f.id}>
                                    <Table.Cell className="py-1.5">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <MIcon name="attach_file" size={15} className="shrink-0 text-muted" />
                                        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                                          {f.path || f.file.name}
                                        </span>
                                      </div>
                                    </Table.Cell>
                                    <Table.Cell className="py-1.5">
                                      <div className="flex items-center justify-end gap-2 text-[12px] tabular-nums text-muted">
                                        {failed ? (
                                          <span className="text-danger">{status}</span>
                                        ) : current ? (
                                          <span>Uploading…</span>
                                        ) : uploaded ? (
                                          <span
                                            className="flex items-center gap-1.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {shareUrls[index] && <QrCodePopover url={shareUrls[index]} size={24} />}
                                            <Button
                                              variant="tertiary"
                                              size="sm"
                                              onPress={toPressHandler((e) => { e.stopPropagation(); handleCopyOne(index) })}
                                              style={{ height: 24, width: 76, fontSize: 11, justifyContent: "center" }}
                                            >
                                              {copiedIndex === index ? "Copied" : "Copy link"}
                                            </Button>
                                          </span>
                                        ) : (
                                          <span>{status}</span>
                                        )}
                                      </div>
                                    </Table.Cell>
                                  </Table.Row>
                                )
                              })
                            )}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>
                )}

                {/* ── Options (Files) ── */}
                {showOptions && uploadType !== "cdn" && (
                  <div>
                    <div className={`${PAD} pt-3 pb-1`}>
                      <span className={SECTION}>Options</span>
                    </div>

                    {isMultiFile && (
                      <>
                        <ToggleRow
                          label="Zip the files"
                          on={zipMultipleFiles}
                          onToggle={() => setZipMultipleFiles(!zipMultipleFiles)}
                          sub="Uploading multiple files in a ZIP counts as 1 file."
                        />
                        <Separator />
                      </>
                    )}

                    {isMultiFile ? (
                      zipMultipleFiles ? (
                        <>
                          <ToggleField
                            label="Archive name"
                            sub="Name the zip file that gets created."
                            expanded={renameOpen}
                            onToggle={() => setRenameOpen(!renameOpen)}
                          >
                            <TextField aria-label="Archive name" value={customFilename} onChange={setCustomFilename} className="w-full">
                              <Input placeholder="hypastack-archive" />
                            </TextField>
                          </ToggleField>
                          <Separator />
                          {/* Zipped = one share link, so a custom link applies */}
                          <CustomLinkField
                            slugLocked={slugLocked}
                            expanded={linkOpen}
                            onToggle={() => setLinkOpen(!linkOpen)}
                            customSlug={customSlug}
                            setCustomSlug={setCustomSlug}
                            slugError={slugError}
                            setSlugError={setSlugError}
                            prefix="/d/"
                            placeholder="my-archive"
                            previewBase="hypastack.com/d/"
                          />
                          <Separator />
                        </>
                      ) : (
                        <>
                          <NoCustomLinkNote text="Custom links aren't available when uploading files separately. Zip them into one archive to use one." />
                          <Separator />
                        </>
                      )
                    ) : (
                      <>
                        <ToggleField
                          label="Rename file"
                          sub="Give the uploaded file a different name."
                          expanded={renameOpen}
                          onToggle={() => setRenameOpen(!renameOpen)}
                        >
                          <TextField aria-label="Rename file" value={customFilename} onChange={setCustomFilename} className="w-full">
                            <Input placeholder={files[0]?.file.name || "example.pdf"} />
                          </TextField>
                        </ToggleField>
                        <Separator />
                        <CustomLinkField
                          slugLocked={slugLocked}
                          expanded={linkOpen}
                          onToggle={() => setLinkOpen(!linkOpen)}
                          customSlug={customSlug}
                          setCustomSlug={setCustomSlug}
                          slugError={slugError}
                          setSlugError={setSlugError}
                          prefix="/d/"
                          placeholder="my-custom-file"
                          previewBase="hypastack.com/d/"
                        />
                        <Separator />
                      </>
                    )}

                    <ToggleField
                      label="Note"
                      sub="Shown to whoever opens the link."
                      expanded={noteOpen}
                      onToggle={() => setNoteOpen(!noteOpen)}
                    >
                      <TextField aria-label="Note" value={note} onChange={setNote} className="w-full" maxLength={100}>
                        <TextArea rows={2} className="resize-none" placeholder="Optional message…" />
                      </TextField>
                    </ToggleField>
                    <Separator />

                    <ToggleRow
                      label="Burn after download"
                      sub="Delete the file the moment it's downloaded."
                      on={burnOnRead}
                      onToggle={() => setBurnOnRead(!burnOnRead)}
                    />
                    <Separator />

                    {/* Custom expiration (Plus plan and above) */}
                    <ToggleField
                      label="Expires after"
                      sub="How long the link stays active before it's gone."
                      expanded={expiresOpen}
                      onToggle={() => setExpiresOpen(!expiresOpen)}
                      locked={slugLocked}
                      valuePreview={!slugLocked ? currentExpLabel : undefined}
                    >
                      <Slider
                        min={0}
                        max={EXPIRATION_STEPS.length - 1}
                        step={1}
                        value={expIndex}
                        onChange={(v) => setExpirationMinutes(EXPIRATION_STEPS[v].minutes)}
                        aria-label="Expires after"
                      />
                      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                        <span>1 min</span>
                        <span>30 days</span>
                      </div>
                    </ToggleField>
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
                        expanded={linkOpen}
                        onToggle={() => setLinkOpen(!linkOpen)}
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

                {normalizeTier(user?.tier) !== "max" && (
                  <div className={`${PAD} pb-3 pt-2`}>
                    <p className="text-[11px] text-muted">
                      Want faster uploads and deletes?{" "}
                      <a href="/pricing" className="underline hover:text-foreground transition-colors">
                        Upgrade your plan
                      </a>
                      .
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <Card.Footer className="flex-col items-stretch gap-0 border-t border-white/10 px-3 py-2.5">
                <div className="mb-2.5 flex items-center gap-2 px-0.5">
                  {(state === "uploading" || state === "zipping") && (
                    <span className="shrink-0 text-muted">
                      <Loader size={18} />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[16px] font-semibold leading-tight text-foreground">{footerTitle}</span>
                    <span className="line-clamp-1 text-[13px] leading-tight text-muted">{footerSub}</span>
                  </div>
                </div>

                {state === "selected" ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="tertiary" size="sm" onPress={doFullReset}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleUpload}
                      isDisabled={isUploading || (!turnstileReady && process.env.NODE_ENV !== "development")}
                      style={{ gap: 8 }}
                    >
                      <MIcon name="arrow_upward" size={16} />
                      Start
                    </Button>
                  </div>
                ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="tertiary" size="sm" onPress={doFullReset}>
                      Done
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleCopy}
                      style={
                        copied
                          ? { gap: 8, ["--button-bg" as string]: "#059669", ["--button-bg-hover" as string]: "#047857" }
                          : { gap: 8 }
                      }
                    >
                      <MIcon name={copied ? "check" : "content_copy"} size={16} />
                      {copied ? "Copied" : "Copy all"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="tertiary" size="sm" onPress={doFullReset}>
                      Clear
                    </Button>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => inputRef.current?.click()}
                      style={{ gap: 8 }}
                    >
                      <MIcon name="add" size={16} />
                      Add more
                    </Button>
                  </div>
                )}
              </Card.Footer>
            </>
          )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ── Presentational helpers ──

// XHR reports progress in coarse jumps, so this eases between reported values,
// making the ring and number travel instead of teleporting. Target stays real.
function useSmoothPercent(target: number) {
  const spring = useSpring(target, { stiffness: 90, damping: 20, mass: 0.5 })
  const [shown, setShown] = useState(target)

  useEffect(() => { spring.set(target) }, [spring, target])
  useEffect(() => spring.on("change", (v) => setShown(v)), [spring])

  return shown
}

// name, status/progress, size, optional copy chip.
function TrayFileRow({
  name,
  status,
  size,
  uploading = false,
  progressPct = null,
  showCopy = false,
  copied = false,
  onCopy,
  url,
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
  /** The uploaded file's share link, enables the QR code trigger next to Copy. */
  url?: string
  error?: boolean
}) {
  const smooth = useSmoothPercent(progressPct ?? 0)
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/5 px-3"
      style={{ height: 38 }}
    >
      <MIcon name="attach_file" size={17} className="shrink-0 text-muted" />

      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-foreground">
        {name}
      </p>

      <div className="flex shrink-0 items-center gap-2 text-[12px] tabular-nums text-muted">
        {error ? (
          <span className="text-danger">{status}</span>
        ) : (
          <>
            {uploading && (
              <>
                <span>{Math.round(smooth)}%</span>
                <ProgressCircle value={smooth} size="sm" aria-label="Upload progress">
                  <ProgressCircle.Track>
                    <ProgressCircle.TrackCircle />
                    <ProgressCircle.FillCircle />
                  </ProgressCircle.Track>
                </ProgressCircle>
              </>
            )}
            {size !== undefined && <span>{formatBytes(size)}</span>}
          </>
        )}
        {showCopy && onCopy && (
          <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {url && <QrCodePopover url={url} size={24} />}
            <Button
              variant="tertiary"
              size="sm"
              onPress={toPressHandler((e) => { e.stopPropagation(); onCopy() })}
              style={{ height: 24, fontSize: 11, paddingLeft: 8, paddingRight: 8 }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </span>
        )}
      </div>
    </div>
  )
}

// Toggle row with icon + label (+ optional helper text).
function ToggleRow({
  label,
  on,
  onToggle,
  sub,
}: {
  label: string
  on: boolean
  onToggle: () => void
  sub?: string
}) {
  return (
    <div className={`${PAD} py-3`}>
      <div className="flex cursor-pointer items-center justify-between gap-3" onClick={onToggle}>
        <span className={LABEL}>{label}</span>
        <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
          <Switch isSelected={on} onChange={onToggle} aria-label={label}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </span>
      </div>
      {sub && <p className={`mt-1.5 leading-snug ${MUTED}`}>{sub}</p>}
    </div>
  )
}

// Toggle row that reveals a control (text field, slider…) underneath itself
// once switched on, instead of showing the input up front. `locked` swaps the
// switch for the same upgrade chip ToggleRow's siblings use.
function ToggleField({
  label,
  sub,
  expanded,
  onToggle,
  locked = false,
  valuePreview,
  children,
}: {
  label: string
  /** One-line gray description under the label, explaining what the feature does. */
  sub?: string
  expanded: boolean
  onToggle: () => void
  locked?: boolean
  /** Small value shown next to the switch when collapsed, e.g. the current expiry. */
  valuePreview?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  const field = (
    <div
      className={`${PAD} py-3 ${locked ? "cursor-pointer" : ""}`}
      onClick={locked ? () => router.push("/pricing") : undefined}
    >
      <div
        className={`flex items-center justify-between gap-3 ${locked ? "" : "cursor-pointer"}`}
        onClick={locked ? undefined : onToggle}
      >
        <span className={LABEL}>{label}</span>
        <span onClick={locked ? undefined : (e) => e.stopPropagation()} className="flex shrink-0 items-center gap-2">
          {!expanded && valuePreview && <span className="text-[12px] font-semibold text-foreground">{valuePreview}</span>}
          <Switch isSelected={locked ? false : expanded} isDisabled={locked} onChange={onToggle} aria-label={label}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </span>
      </div>
      {sub && <p className={`mt-1.5 leading-snug ${MUTED}`}>{sub}</p>}
      {!locked && expanded && <div className="mt-2.5">{children}</div>}
    </div>
  )

  if (!locked) return field

  return (
    <Tooltip content={<span className="flex items-center gap-1.5"><MIcon name="lock" size={12} />Paid</span>}>
      {field}
    </Tooltip>
  )
}


// Shared custom-link (slug) field. Used for single files, zipped archives, and
// single CDN assets, anywhere the upload yields exactly one share link. Free
// users see it locked; the server is the real gate.
function CustomLinkField({
  slugLocked,
  expanded,
  onToggle,
  customSlug,
  setCustomSlug,
  slugError,
  setSlugError,
  prefix,
  placeholder,
  previewBase,
}: {
  slugLocked: boolean
  expanded: boolean
  onToggle: () => void
  customSlug: string
  setCustomSlug: (v: string) => void
  slugError: { message: string; suggestions: string[] } | null
  setSlugError: (v: { message: string; suggestions: string[] } | null) => void
  prefix: string
  placeholder: string
  previewBase: string
}) {
  return (
    <ToggleField
      label="Custom link"
      sub="Pick your own link instead of a random one."
      expanded={expanded}
      onToggle={onToggle}
      locked={slugLocked}
    >
      <TextField
        aria-label="Custom link"
        value={customSlug}
        onChange={(v) => {
          setCustomSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
          if (slugError) setSlugError(null)
        }}
        maxLength={64}
        className="w-full"
      >
        <InputGroup>
          <InputGroup.Prefix>{prefix}</InputGroup.Prefix>
          <InputGroup.Input placeholder={placeholder} />
        </InputGroup>
      </TextField>
      {slugError ? (
        <div className="mt-2">
          <p className="text-[11px] text-danger">{slugError.message}</p>
          {slugError.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {slugError.suggestions.map((s) => (
                <Button
                  key={s}
                  variant="tertiary"
                  size="sm"
                  onPress={() => { setCustomSlug(s); setSlugError(null) }}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        customSlug.trim() && (
          <p className="mt-2 truncate text-[11px] text-muted">
            {previewBase}{customSlug.trim()}
          </p>
        )
      )}
    </ToggleField>
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
