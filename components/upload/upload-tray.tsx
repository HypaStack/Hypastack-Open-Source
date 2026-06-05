"use client"

import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import Turnstile from "react-turnstile"
import { normalizeTier } from "@/lib/tier-limits"
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

  return (
    <AnimatePresence>
      {trayVisible && (
        <motion.div
          initial={{ opacity: 0, x: 500 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 500 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)] rounded-t-[20px] sm:rounded-[20px] bg-white font-sans mb-8 sm:mb-0"
          style={{ padding: 1, boxShadow: "0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)" }}
        >
          <div className="w-full h-full bg-white overflow-hidden flex flex-col sm:rounded-[20px] rounded-t-[20px]">
            <div className="flex flex-col gap-2 px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3
                  className="text-[17px] font-semibold text-[#111] tracking-tight"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  Uploads
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="hover:bg-[#f0f0f0] active:scale-[0.97] transition-all duration-75"
                    style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 12, fontSize: 13, fontWeight: 500, color: "#666" }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrayCollapsed((v) => !v)}
                    className="p-1 rounded-md text-[#999] hover:text-[#555] hover:bg-[#f0f0f0] transition-colors"
                    aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
                  >
                    {trayCollapsed ? <MIcon name="expand_less" size={18} /> : <MIcon name="expand_more" size={18} />}
                  </button>
                </div>
              </div>

              <p className="text-[13px] text-[#888] font-normal">
                Uploading to <span className="text-[#333] font-medium">{uploadType === "cdn" ? "CDN" : "Files"}</span>
              </p>
              {normalizeTier(user?.tier) !== "ultimate" && (
                <p className="text-[12px] text-[#999] font-normal">
                  For higher upload and deletion speeds,{" "}
                  <a href="/pricing" className="text-[#555] underline hover:text-[#111] transition-colors">
                    upgrade your plan
                  </a>
                  .
                </p>
              )}
              {uploadType !== "cdn" && state === "done" && shareUrl && shareUrl.includes("\n") && (
                <div className="mt-1 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
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
                        <div className="mt-1.5 h-1 w-full bg-secondary">
                          <div className="h-full bg-[#9b9b9b] transition-all" style={{ width: `${zipProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(state === "selected" || state === "uploading" || state === "done" || state === "error") && (
                    <>
                      {zippedFile ? (
                        <div className="relative flex items-center gap-3 group" style={{ padding: "10px 16px" }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium text-[#111] truncate leading-tight">{zippedFile.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#666", backgroundColor: "#f0f0f0", border: "1px solid #e5e5e5", padding: "2px 6px", borderRadius: 5 }}>
                                ZIP
                              </span>
                              <span style={{ fontSize: 13, color: "#888" }}>
                                {state === "done"
                                  ? `Uploaded · ${files.length} file${files.length !== 1 ? "s" : ""} archived`
                                  : state === "error"
                                  ? "Failed"
                                  : state === "uploading"
                                  ? `${formatFileSize(zippedFile.size * (progress / 100))} / ${formatFileSize(zippedFile.size)}`
                                  : "Pending"}
                              </span>
                            </div>
                          </div>
                          {state === "done" && (
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopy() }}
                                className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75"
                                style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#0a0a0a", backgroundColor: "#ffffff" }}
                              >
                                {copied ? "Copied" : "Copy link"}
                              </button>
                            </div>
                          )}
                          {state === "uploading" && (
                            <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: "#e5e5e5" }}>
                              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 1, backgroundColor: "#555", transition: "width 0.3s ease" }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        files.map((f, index) => (
                          <div key={f.id} className="relative flex items-center gap-3 group" style={{ padding: "10px 16px" }}>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-medium text-[#111] truncate leading-tight">{f.path || f.file.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#666", backgroundColor: "#f0f0f0", border: "1px solid #e5e5e5", padding: "2px 6px", borderRadius: 5 }}>
                                  {f.file.name.split(".").pop()?.substring(0, 4) || "FILE"}
                                </span>
                                <span style={{ fontSize: 13, color: "#888" }}>
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
                                      ? `${formatFileSize(f.file.size * (progress / 100))} / ${formatFileSize(f.file.size)}`
                                      : "Pending"
                                    : "Pending"}
                                </span>
                              </div>
                            </div>
                            {state === "done" && (
                              <div className="shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCopy() }}
                                  className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75"
                                  style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#0a0a0a", backgroundColor: "#ffffff" }}
                                >
                                  {copied ? "Copied" : "Copy link"}
                                </button>
                              </div>
                            )}
                            {state === "uploading" && index === uploadingIndex && (
                              <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: "#e5e5e5" }}>
                                <div style={{ height: "100%", width: `${progress}%`, borderRadius: 1, backgroundColor: "#555", transition: "width 0.3s ease" }} />
                              </div>
                            )}
                            {state === "uploading" && index < uploadingIndex && (
                              <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: "#e5e5e5" }}>
                                <div style={{ height: "100%", width: "100%", borderRadius: 1, backgroundColor: "#555" }} />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                  
                  {state === "selected" && uploadType !== "cdn" && (
                    <div style={{ margin: "0 12px 8px", backgroundColor: "#f5f5f5", borderRadius: 16, border: "1px solid #ebebeb" }}>
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-[#ebebeb] transition-all duration-75"
                        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
                        onClick={() => setBurnOnRead(!burnOnRead)}
                      >
                        <div className="flex items-center gap-2.5">
                          <MIcon name="local_fire_department" size={16} style={{ color: "#888" }} />
                          <span style={{ fontSize: 13, color: "#333" }}>Burn after download</span>
                        </div>
                        <div
                          className="relative shrink-0 transition-colors"
                          style={{ width: 34, height: 20, borderRadius: 10, backgroundColor: burnOnRead ? "#555" : "#ddd", border: burnOnRead ? "none" : "1px solid #ccc" }}
                        >
                          <div
                            className="absolute top-[3px] transition-transform bg-white"
                            style={{ width: 14, height: 14, borderRadius: 7, left: burnOnRead ? 17 : 3 }}
                          />
                        </div>
                      </div>

                      <div style={{ height: 1, margin: "4px 8px", backgroundColor: "rgba(0,0,0,0.07)" }} />

                      {isMultiFile ? (
                        <>
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-[#ebebeb] transition-all duration-75"
                            style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
                            onClick={() => setZipMultipleFiles(!zipMultipleFiles)}
                          >
                            <div className="flex items-center gap-2.5">
                              <MIcon name="folder_zip" size={16} style={{ color: "#888" }} />
                              <span style={{ fontSize: 13, color: "#333" }}>Zip the files</span>
                            </div>
                            <div
                              className="relative shrink-0 transition-colors"
                              style={{ width: 34, height: 20, borderRadius: 10, backgroundColor: zipMultipleFiles ? "#555" : "#ddd", border: zipMultipleFiles ? "none" : "1px solid #ccc" }}
                            >
                              <div
                                className="absolute top-[3px] transition-transform bg-white"
                                style={{ width: 14, height: 14, borderRadius: 7, left: zipMultipleFiles ? 17 : 3 }}
                              />
                            </div>
                          </div>
                          <div style={{ padding: "0 12px 6px" }}>
                            <p style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>
                              Uploading multiple files in a ZIP counts as 1 file, uploading multiple files without ZIP&apos;ing, will count normally.
                            </p>
                          </div>
                          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "rgba(0,0,0,0.07)" }} />
                          {zipMultipleFiles && (
                            <>
                              <div style={{ padding: "6px 8px 4px" }}>
                                <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                                  <MIcon name="folder_zip" size={15} style={{ color: "#999" }} />
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>Archive name</span>
                                </div>
                                <input
                                  type="text"
                                  value={customFilename}
                                  onChange={(e) => setCustomFilename(e.target.value)}
                                  placeholder="hypastack-archive"
                                  className="w-full placeholder:text-[#bbb] focus:outline-none focus:border-[#ccc]"
                                  style={{ height: 34, paddingLeft: 10, paddingRight: 10, borderRadius: 10, backgroundColor: "#ffffff", border: "1px solid #e5e5e5", fontSize: 13, color: "#111" }}
                                />
                              </div>
                              <div style={{ height: 1, margin: "4px 8px", backgroundColor: "rgba(0,0,0,0.07)" }} />
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ padding: "6px 8px 4px" }}>
                            <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                              <MIcon name="edit" size={15} style={{ color: "#999" }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>Rename file</span>
                            </div>
                            <input
                              type="text"
                              value={customFilename}
                              onChange={(e) => setCustomFilename(e.target.value)}
                              placeholder={files[0]?.file.name || "example.pdf"}
                              className="w-full placeholder:text-[#bbb] focus:outline-none focus:border-[#ccc]"
                              style={{ height: 34, paddingLeft: 10, paddingRight: 10, borderRadius: 10, backgroundColor: "#ffffff", border: "1px solid #e5e5e5", fontSize: 13, color: "#111" }}
                            />
                          </div>
                          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "rgba(0,0,0,0.07)" }} />
                        </>
                      )}

                      <div style={{ padding: "6px 8px 6px" }}>
                        <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                          <MIcon name="article" size={15} style={{ color: "#999" }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>Note</span>
                        </div>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional message..."
                          maxLength={100}
                          rows={2}
                          className="w-full placeholder:text-[#bbb] focus:outline-none focus:border-[#ccc] resize-none"
                          style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 10, backgroundColor: "#ffffff", border: "1px solid #e5e5e5", fontSize: 13, color: "#111" }}
                        />
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>

                {state === "selected" && uploadType !== "cdn" && process.env.NODE_ENV !== "development" && (
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
                      <MIcon
                        name="cloud_upload"
                        size={22}
                        className={`shrink-0 ${state === "uploading" ? "text-white" : "text-[#888]"}`}
                      />
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-white">
                          {state === "done"
                            ? "Upload complete"
                            : state === "uploading"
                            ? `Uploading... (${uploadingIndex}/${files.length - uploadingIndex})`
                            : state === "error"
                            ? "Upload failed"
                            : `Ready to upload ${files.length} item${files.length !== 1 ? "s" : ""}`}
                        </span>
                        <span className={`text-[13px] ${state === "uploading" ? "text-white/60" : "text-[#666]"}`}>
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
                          className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                          style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 13, fontWeight: 500, color: "#888" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpload}
                          disabled={isUploading || (uploadType !== "cdn" && !turnstileReady)}
                          className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 disabled:opacity-50"
                          style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 600, color: "#0a0a0a", backgroundColor: "#ffffff" }}
                        >
                          Start
                        </button>
                      </div>
                    ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 disabled:opacity-50"
                        style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 600, color: "#0a0a0a", backgroundColor: "#ffffff" }}
                      >
                        {copied ? "Copied All" : "Copy All Links"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                        style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 500, color: "#e3e3e3" }}
                      >
                        Add more
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
