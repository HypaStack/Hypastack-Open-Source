"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { UploadProcessIcon } from "./upload-process-icon"
import Turnstile from "react-turnstile"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { EXPIRATION_STEPS } from "@/constants/upload"
import { formatFileSize } from "./utils"
import type { UseUploadReturn } from "./use-upload"

const TurnstileWithRef = Turnstile as React.ComponentType<
  React.ComponentProps<typeof Turnstile> & { ref?: React.RefObject<{ reset(): void }> }
>

type UploadTrayProps = UseUploadReturn

export function UploadTray({
  state,
  files,
  progress,
  copied,
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
  handleReset,
  getUploadStats,
  user,
  uploadType,
}: UploadTrayProps) {
  const trayVisible = state !== "idle"
  // Free users still SEE the custom-link / expiration controls (so they know
  // the features exist) but the inputs are locked. The server is the real gate.
  const slugLocked = !isPaidTier(normalizeTier(user?.tier))
  const expIndex = Math.max(0, EXPIRATION_STEPS.findIndex((s) => s.minutes === expirationMinutes))
  const currentExpLabel = EXPIRATION_STEPS[expIndex]?.label ?? EXPIRATION_STEPS[EXPIRATION_STEPS.length - 1].label

  return (
    <AnimatePresence>
      {trayVisible && (
        <motion.div
          initial={{ opacity: 0, x: 500 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 500 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)] rounded-t-[16px] sm:rounded-[16px] bg-white dark:bg-[#08090a] font-sans mb-8 sm:mb-0 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <div className="w-full h-full bg-white dark:bg-[#0e0f10] overflow-hidden flex flex-col sm:rounded-[16px] rounded-t-[16px]">
            <div className="flex flex-col gap-2 px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3
                  className="text-[17px] font-semibold text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  Uploads
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-[28px] px-3 rounded-full text-[13px] font-medium transition-all duration-150 active:scale-[0.97] text-[#666] dark:text-[#898e97] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#333] dark:hover:text-[#f7f8f8]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrayCollapsed((v) => !v)}
                    className="p-1 rounded-full text-[#999] dark:text-[#898e97] hover:text-[#555] dark:hover:text-[#f7f8f8] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
                  >
                    {trayCollapsed ? <MIcon name="expand_less" size={18} /> : <MIcon name="expand_more" size={18} />}
                  </button>
                </div>
              </div>

              <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal">
                Uploading to <span className="text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] font-medium">{uploadType === "cdn" ? "CDN" : "Files"}</span>
              </p>
              {normalizeTier(user?.tier) !== "ultimate" && (
                <p className="text-[12px] text-[#999] dark:text-[#898e97] font-normal">
                  For higher upload and deletion speeds,{" "}
                  <a href="/pricing" className="text-[#555] dark:text-[#a1a1aa] underline hover:text-[#111] dark:hover:text-white transition-colors">
                    upgrade your plan
                  </a>
                  .
                </p>
              )}
              {uploadType !== "cdn" && state === "done" && shareUrl && shareUrl.includes("\n") && (
                <div className="mt-1 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                  <div className="flex items-start gap-2">
                    <MIcon name="warning" size={16} className="mt-0.5 shrink-0" />
                    <div className="flex flex-col text-[12px] leading-snug">
                      <span className="font-semibold mb-0.5">Copy all links!</span>
                      <span>If you don&apos;t copy the links, all files that you&apos;ve shared will be unrecoverable.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!trayCollapsed && (
              <>
                <div className="max-h-[480px] overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {state === "zipping" && (
                    <div className="px-5 py-3 flex items-center gap-3">
                      <MIcon name="folder_zip" size={18} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-foreground">Zipping {files.length} items...</p>
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#3a3b3c] to-[#6b7280] transition-[width] duration-300 ease-out dark:from-[#8a9099] dark:to-[#f7f8f8]" style={{ width: `${zipProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(state === "selected" || state === "uploading" || state === "done" || state === "error") && (
                    <>
                      {zippedFile ? (
                        <div className="relative flex items-center gap-3 group" style={{ padding: "10px 16px" }}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] truncate leading-tight">{zippedFile.name}</p>
                              <span className="shrink-0 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.08)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97]" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", borderStyle: "solid", borderWidth: 1, padding: "2px 6px", borderRadius: 5 }}>
                                ZIP
                              </span>
                            </div>
                            <span className="text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]" style={{ fontSize: 13 }}>
                              {state === "done"
                                ? `Uploaded · ${files.length} file${files.length !== 1 ? "s" : ""} archived`
                                : state === "error"
                                ? "Failed"
                                : state === "uploading"
                                ? "Uploading..."
                                : "Pending"}
                            </span>
                          </div>
                          {state === "done" && (
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopy() }}
                                className="hover:bg-[#e2e2e8] dark:hover:bg-[#2c2c2c] active:scale-[0.97] transition-all duration-75 text-[#0a0a0a] dark:text-[#e3e3e3] bg-[#ffffff] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]"
                                style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 6, fontSize: 13, fontWeight: 500 }}
                              >
                                {copied ? "Copied" : "Copy link"}
                              </button>
                            </div>
                          )}
                          {state === "uploading" && (
                            <div className="absolute left-4 right-4 bottom-[2px] h-[3px] overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#3a3b3c] to-[#6b7280] transition-[width] duration-300 ease-out dark:from-[#8a9099] dark:to-[#f7f8f8]" style={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        files.map((f, index) => (
                          <div key={f.id} className="relative flex items-center gap-3 group" style={{ padding: "10px 16px" }}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] truncate leading-tight">{f.path || f.file.name}</p>
                                <span className="shrink-0 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.08)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97]" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", borderStyle: "solid", borderWidth: 1, padding: "2px 6px", borderRadius: 5 }}>
                                  {f.file.name.split(".").pop()?.substring(0, 4) || "FILE"}
                                </span>
                              </div>
                              <span className="text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]" style={{ fontSize: 13 }}>
                                {state === "done"
                                  ? "Uploaded"
                                  : state === "error"
                                  ? index < uploadingIndex
                                    ? "Uploaded"
                                    : index === uploadingIndex
                                    ? "Failed"
                                    : "Skipped"
                                  : state === "uploading"
                                  ? index < uploadingIndex
                                    ? "Uploaded"
                                    : index === uploadingIndex
                                    ? "Uploading..."
                                    : "Pending"
                                  : "Pending"}
                              </span>
                            </div>
                            {state === "done" && (
                              <div className="shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCopy() }}
                                  className="hover:bg-[#e2e2e8] dark:hover:bg-[#2c2c2c] active:scale-[0.97] transition-all duration-75 text-[#0a0a0a] dark:text-[#e3e3e3] bg-[#ffffff] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]"
                                  style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 6, fontSize: 13, fontWeight: 500 }}
                                >
                                  {copied ? "Copied" : "Copy link"}
                                </button>
                              </div>
                            )}
                            {(state === "selected" || state === "uploading") && (
                              <div className="absolute left-4 right-4 bottom-[2px] h-[3px] overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#3a3b3c] to-[#6b7280] transition-[width] duration-300 ease-out dark:from-[#8a9099] dark:to-[#f7f8f8]"
                                  style={{ width: state === "uploading" ? (index < uploadingIndex ? "100%" : index === uploadingIndex ? `${progress}%` : "0%") : "0%" }}
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                  
                  {state === "selected" && uploadType !== "cdn" && (
                    <div className="bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]" style={{ margin: "0 12px 12px", borderRadius: 12 }}>
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-[rgba(255,255,255,0.03)] transition-all duration-150"
                        style={{ height: 44, paddingLeft: 14, paddingRight: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                        onClick={() => setBurnOnRead(!burnOnRead)}
                      >
                        <div className="flex items-center gap-3">
                          <MIcon name="local_fire_department" size={18} className="text-[#888] dark:text-[#898e97]" />
                          <span className="text-[#333] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Burn after download</span>
                        </div>
                        <div
                          className="relative shrink-0 transition-colors duration-200"
                          style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: burnOnRead ? "#f7f8f8" : "rgba(255,255,255,0.08)", border: burnOnRead ? "none" : "1px solid rgba(255,255,255,0.1)" }}
                        >
                          <div
                            className="absolute top-[2px] transition-transform duration-200"
                            style={{ width: 14, height: 14, borderRadius: 7, left: burnOnRead ? 19 : 3, backgroundColor: burnOnRead ? "#0e0f10" : "#898e97" }}
                          />
                        </div>
                      </div>

                      <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />

                      {/* Custom expiration (Essential plan and above) */}
                      <div style={{ padding: "12px 14px 12px" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MIcon name="schedule" size={16} className="text-[#999] dark:text-[#898e97]" />
                            <span className="text-[#666] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Expires after</span>
                          </div>
                          {slugLocked ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#999] dark:text-[#898e97]">
                              <MIcon name="lock" size={12} /> Essential+
                            </span>
                          ) : (
                            <span className="text-[12px] font-medium text-[#333] dark:text-[#f7f8f8]">{currentExpLabel}</span>
                          )}
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={EXPIRATION_STEPS.length - 1}
                          step={1}
                          value={slugLocked ? EXPIRATION_STEPS.length - 1 : expIndex}
                          onChange={(e) => { if (!slugLocked) setExpirationMinutes(EXPIRATION_STEPS[Number(e.target.value)].minutes) }}
                          disabled={slugLocked}
                          aria-label="Expires after"
                          className={`w-full ${slugLocked ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                          style={{ accentColor: "#8a9099" }}
                        />
                        {slugLocked ? (
                          <a href="/pricing" className="inline-block mt-1 text-[11px] text-[#888] dark:text-[#898e97] underline hover:text-[#111] dark:hover:text-white transition-colors">
                            Upgrade to choose a custom expiry
                          </a>
                        ) : (
                          <div className="flex justify-between mt-1 text-[10px] text-[#999] dark:text-[#6b6b6b]">
                            <span>1 min</span>
                            <span>30 days</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />

                      {isMultiFile ? (
                        <>
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-[rgba(255,255,255,0.03)] transition-all duration-150"
                            style={{ height: 44, paddingLeft: 14, paddingRight: 14 }}
                            onClick={() => setZipMultipleFiles(!zipMultipleFiles)}
                          >
                            <div className="flex items-center gap-3">
                              <MIcon name="folder_zip" size={18} className="text-[#888] dark:text-[#898e97]" />
                              <span className="text-[#333] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Zip the files</span>
                            </div>
                            <div
                              className="relative shrink-0 transition-colors duration-200"
                              style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: zipMultipleFiles ? "#f7f8f8" : "rgba(255,255,255,0.08)", border: zipMultipleFiles ? "none" : "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <div
                                className="absolute top-[2px] transition-transform duration-200"
                                style={{ width: 14, height: 14, borderRadius: 7, left: zipMultipleFiles ? 19 : 3, backgroundColor: zipMultipleFiles ? "#0e0f10" : "#898e97" }}
                              />
                            </div>
                          </div>
                          <div style={{ padding: "0 14px 12px" }}>
                            <p className="text-[#888] dark:text-[#898e97]" style={{ fontSize: 12, lineHeight: 1.4 }}>
                              Uploading multiple files in a ZIP counts as 1 file.
                            </p>
                          </div>
                            <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />
                            {zipMultipleFiles ? (
                              <>
                                <div style={{ padding: "12px 14px 12px" }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <MIcon name="folder_zip" size={16} className="text-[#999] dark:text-[#898e97]" />
                                    <span className="text-[#666] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Archive name</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={customFilename}
                                    onChange={(e) => setCustomFilename(e.target.value)}
                                    placeholder="hypastack-archive"
                                    className="w-full placeholder:text-[#666] dark:placeholder:text-[#898e97] focus:outline-none focus:border-[#888] dark:focus:border-[#f7f8f8] bg-white dark:bg-[rgba(255,255,255,0.03)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f7f8f8] transition-colors duration-150"
                                    style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 8, borderStyle: "solid", borderWidth: 1, fontSize: 13 }}
                                  />
                                </div>
                                <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />
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
                                <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />
                            </>
                          ) : (
                              <>
                                <NoCustomLinkNote text="Custom links aren't available when uploading files separately — zip them into one archive to use one." />
                                <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />
                              </>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ padding: "12px 14px 12px" }}>
                            <div className="flex items-center gap-2 mb-2">
                              <MIcon name="edit" size={16} className="text-[#999] dark:text-[#898e97]" />
                              <span className="text-[#666] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Rename file</span>
                            </div>
                            <input
                              type="text"
                              value={customFilename}
                              onChange={(e) => setCustomFilename(e.target.value)}
                              placeholder={files[0]?.file.name || "example.pdf"}
                              className="w-full placeholder:text-[#666] dark:placeholder:text-[#898e97] focus:outline-none focus:border-[#888] dark:focus:border-[#f7f8f8] bg-white dark:bg-[rgba(255,255,255,0.03)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f7f8f8] transition-colors duration-150"
                              style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 8, borderStyle: "solid", borderWidth: 1, fontSize: 13 }}
                            />
                          </div>
                          <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />

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
                          <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.06)]" style={{ height: 1 }} />
                        </>
                      )}

                      <div style={{ padding: "12px 14px 14px" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <MIcon name="article" size={16} className="text-[#999] dark:text-[#898e97]" />
                          <span className="text-[#666] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Note</span>
                        </div>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional message..."
                          maxLength={100}
                          rows={2}
                          className="w-full placeholder:text-[#666] dark:placeholder:text-[#898e97] focus:outline-none focus:border-[#888] dark:focus:border-[#f7f8f8] resize-none bg-white dark:bg-[rgba(255,255,255,0.03)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f7f8f8] transition-colors duration-150"
                          style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 8, borderStyle: "solid", borderWidth: 1, fontSize: 13 }}
                        />
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>

                {/* Custom link for a single CDN asset; note for multi (Essential plan and above) */}
                {state === "selected" && uploadType === "cdn" && (
                  <div className="bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]" style={{ margin: "0 12px 12px", borderRadius: 12 }}>
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

                {state === "selected" && process.env.NODE_ENV !== "development" && (
                  <div className="flex justify-center px-4 py-3 border-t border-border/40 bg-secondary/10">
                    <TurnstileWithRef
                      ref={turnstileRef}
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                      onVerify={(token) => { setTurnstileToken(token); setTurnstileReady(true) }}
                      onExpire={() => { setTurnstileToken(""); setTurnstileReady(false) }}
                      theme="dark"
                    />
                  </div>
                )}

                <div className="relative overflow-hidden bg-transparent">
                  <div className="relative z-10 flex items-center justify-between p-4 pl-5">
                    <div className="flex items-center gap-3">
                      <UploadProcessIcon active={state === "uploading"} size={24} />
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-[#111] dark:text-white dark:text-[#f0f0f0]">
                          {state === "done"
                            ? "Upload complete"
                            : state === "uploading"
                            ? `Uploading... (${uploadingIndex}/${files.length - uploadingIndex})`
                            : state === "error"
                            ? "Upload failed"
                            : `Ready to upload ${files.length} item${files.length !== 1 ? "s" : ""}`}
                        </span>
                        <span className="text-[13px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97]">
                          {state === "done"
                            ? "All files uploaded"
                            : state === "uploading"
                            ? getUploadStats()
                            : state === "error"
                            ? errorMessage
                            : "Click start to begin"}
                        </span>
                      </div>
                    </div>

                    {state === "selected" ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="flex-1 sm:flex-none flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.97] transition-all duration-150 text-[#898e97] text-[13px] font-medium"
                          style={{ height: 34, paddingLeft: 12, paddingRight: 12 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpload}
                          disabled={isUploading || (!turnstileReady && process.env.NODE_ENV !== "development")}
                          className="relative flex-1 sm:flex-none inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                          style={{ height: 34 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
                          <div className="relative bg-[#151616] rounded-full px-4 w-full h-full flex items-center justify-center text-[#f7f8f8] text-[13px] font-semibold">
                            Start
                          </div>
                        </button>
                      </div>
                    ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                        style={{ height: 34 }}
                      >
                        <div className={`absolute inset-0 transition-colors duration-300 ${copied ? "bg-gradient-to-tr from-[rgba(16,185,129,0.2)] to-[rgba(16,185,129,0.4)] group-hover:to-[rgba(16,185,129,0.6)]" : "bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)]"}`} />
                        <div className={`relative bg-[#151616] rounded-full px-4 w-full h-full flex items-center justify-center text-[13px] font-semibold ${copied ? "bg-[#0a1a14] text-emerald-400" : "text-[#f7f8f8]"}`}>
                          {copied ? "Copied All" : "Copy All Links"}
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                        style={{ height: 34 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                        <div className="relative bg-[#151616] rounded-full px-4 w-full h-full flex items-center justify-center text-[#f7f8f8] text-[13px] font-semibold">
                          Add more
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <div style={{ padding: "12px 14px 12px" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MIcon name="link" size={16} className="text-[#999] dark:text-[#898e97]" />
          <span className="text-[#666] dark:text-[#f7f8f8]" style={{ fontSize: 13, fontWeight: 500 }}>Custom link</span>
        </div>
        {slugLocked && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#999] dark:text-[#898e97]">
            <MIcon name="lock" size={12} /> Essential+
          </span>
        )}
      </div>
      <div
        className={`flex items-center bg-white dark:bg-[rgba(255,255,255,0.03)] border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] transition-colors duration-150 ${slugLocked ? "opacity-60 cursor-not-allowed select-none" : "focus-within:border-[#888] dark:focus-within:border-[#f7f8f8]"}`}
        style={{ height: 38, borderRadius: 8, borderStyle: "solid", borderWidth: 1, paddingLeft: 12, paddingRight: 12 }}
      >
        <span className="shrink-0 text-[#999] dark:text-[#6b6b6b]" style={{ fontSize: 13 }}>{prefix}</span>
        <input
          type="text"
          value={slugLocked ? "" : customSlug}
          onChange={(e) => {
            if (slugLocked) return
            setCustomSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
            if (slugError) setSlugError(null)
          }}
          placeholder={slugLocked ? "available on paid plans" : placeholder}
          maxLength={64}
          disabled={slugLocked}
          readOnly={slugLocked}
          tabIndex={slugLocked ? -1 : undefined}
          aria-disabled={slugLocked}
          className={`flex-1 min-w-0 bg-transparent placeholder:text-[#666] dark:placeholder:text-[#898e97] focus:outline-none text-[#111] dark:text-[#f7f8f8] ${slugLocked ? "cursor-not-allowed select-none pointer-events-none" : ""}`}
          style={{ fontSize: 13 }}
        />
      </div>
      {slugLocked ? (
        <a
          href="/pricing"
          className="inline-block mt-1.5 text-[11px] text-[#888] dark:text-[#898e97] underline hover:text-[#111] dark:hover:text-white transition-colors"
          style={{ paddingLeft: 2 }}
        >
          Upgrade to Essential to use custom links
        </a>
      ) : slugError ? (
        <div className="mt-2">
          <p className="text-[11px] text-red-500" style={{ paddingLeft: 2 }}>{slugError.message}</p>
          {slugError.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {slugError.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setCustomSlug(s); setSlugError(null) }}
                  className="px-2 py-1 rounded-md text-[11px] bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.06)] text-[#555] dark:text-[#cbd5e1] hover:bg-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        customSlug.trim() && (
          <p className="mt-1.5 text-[11px] text-[#999] dark:text-[#898e97] truncate" style={{ paddingLeft: 2 }}>
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
    <div style={{ padding: "12px 14px 12px" }}>
      <div className="flex items-start gap-2">
        <MIcon name="info" size={14} className="text-[#999] dark:text-[#898e97] shrink-0 mt-0.5" />
        <p className="text-[#888] dark:text-[#898e97]" style={{ fontSize: 12, lineHeight: 1.4 }}>{text}</p>
      </div>
    </div>
  )
}
