"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { generateWrappedFunnelKeypair } from "@/lib/security/funnelCrypto"
import { apiFetch } from "@/lib/http/fetch"

// A floating tray (portaled to <body>) that mirrors the upload tray. Generates
// the funnel keypair client-side, creates the link, then shows it for copying.
export function FunnelCreateTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [customSlug, setCustomSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [link, setLink] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => setMounted(true), [])

  // Reset the form each time the tray is opened.
  useEffect(() => {
    if (open) { setCustomSlug(""); setError(""); setLink(""); setCopied(false) }
  }, [open])

  const funnelUrl = (slug: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/funnel/${slug}` : `/funnel/${slug}`

  const create = async () => {
    if (creating) return
    setCreating(true)
    setError("")
    try {
      const master = await getSessionKey()
      if (!master) { setError("Please sign in again to create a funnel."); return }

      const { publicKey, wrappedPrivateKey } = await generateWrappedFunnelKeypair(master)
      const csrfRes = await apiFetch("/api/v2/csrf")
      const csrfToken = (await csrfRes.json()).token || ""

      const res = await apiFetch("/api/v2/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken, publicKey, wrappedPrivateKey, customSlug: customSlug.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || "Couldn't create the funnel."); return }

      const url = funnelUrl(data.slug)
      setLink(url)
      try { await navigator.clipboard.writeText(url); setCopied(true) } catch {}
    } catch {
      setError("Couldn't create the funnel. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch {}
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="funnel-tray-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      {open && (
          <motion.div
            key="funnel-tray"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[60] flex w-full flex-col font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:w-[420px] sm:max-w-[calc(100vw_-_2rem)] rounded-t-[18px] sm:rounded-[18px] bg-white dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] p-4"
            style={{ boxShadow: "0 16px 50px rgba(0,0,0,0.18)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-[10px] bg-[#f2f2f4] dark:bg-[rgba(255,255,255,0.05)]">
                  <MIcon name="forward_to_inbox" size={17} className="text-[#171717] dark:text-[#e3e3e3]" />
                </div>
                <span className="text-[15px] font-semibold text-[#171717] dark:text-[#e3e3e3]">New funnel</span>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors" aria-label="Close">
                <MIcon name="close" size={18} className="text-[#666] dark:text-[#898e97]" />
              </button>
            </div>

            {!link ? (
              <>
                <p className="text-[13px] text-[#666] dark:text-[#898e97] leading-relaxed mb-3">
                  Creates a one-time link. Whoever opens it can drop a single file into your inbox — encrypted so only you can open it.
                </p>

                <div className="flex items-center rounded-[10px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.03)] px-3 mb-2">
                  <span className="text-[13px] text-[#999] dark:text-[#6b7075] shrink-0">/funnel/</span>
                  <input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="custom-link (optional)"
                    onKeyDown={(e) => { if (e.key === "Enter") create() }}
                    className="flex-1 bg-transparent outline-none text-[13px] text-[#171717] dark:text-[#e3e3e3] py-2.5 px-1"
                  />
                </div>

                {error && <p className="text-[12px] text-red-500 mb-2 px-0.5">{error}</p>}

                <button
                  type="button"
                  onClick={create}
                  disabled={creating}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-70 w-full mt-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
                  <div className="relative bg-[#151616] rounded-full h-[42px] w-full flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                    {creating ? <LoadingSvg variant="white" size={16} /> : <MIcon name="add_link" size={18} />}
                    Create funnel
                  </div>
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-[#666] dark:text-[#898e97] leading-relaxed mb-3">
                  Share this link. It works once — after a file is dropped it closes automatically.
                </p>
                <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.03)] px-3 py-2.5 mb-3">
                  <MIcon name="link" size={16} className="text-[#999] dark:text-[#6b7075] shrink-0" />
                  <span className="flex-1 truncate text-[13px] text-[#171717] dark:text-[#e3e3e3]">{link}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 flex-1"
                  >
                    <div className={`absolute inset-0 transition-colors duration-300 ${copied ? "bg-gradient-to-tr from-[rgba(16,185,129,0.2)] to-[rgba(16,185,129,0.45)] group-hover:to-[rgba(16,185,129,0.6)]" : "bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98]"}`} />
                    <div className={`relative rounded-full h-[42px] w-full flex items-center justify-center gap-2 text-[14px] font-medium ${copied ? "bg-[#0a1a14] text-emerald-400" : "bg-[#151616] text-[#f7f8f8]"}`}>
                      <MIcon name={copied ? "check" : "content_copy"} size={16} />
                      {copied ? "Copied" : "Copy link"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLink(""); setCustomSlug(""); setCopied(false) }}
                    className="inline-flex items-center justify-center h-[42px] px-4 rounded-full border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.1)] text-[14px] font-medium text-[#171717] dark:text-[#e3e3e3] hover:bg-[#f5f5f5] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    New
                  </button>
                </div>
              </>
            )}
          </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
