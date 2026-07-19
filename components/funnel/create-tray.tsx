"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { AlertMessage } from "@/components/ui/alert-message"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { TextInput } from "@/components/ui/text-input"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { generateWrappedFunnelKeypair } from "@/lib/security/funnelCrypto"
import { apiFetch } from "@/lib/http/fetch"

const CARD =
  "bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.035)] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] rounded-[12px]"
const TITLE_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }

export function FunnelCreateTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [customSlug, setCustomSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [link, setLink] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => setMounted(true), [])

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

  const footerTitle = link ? "Funnel ready" : "New funnel"
  const footerSub = link
    ? "Share the link — it works once, then closes."
    : creating
    ? "Generating your keypair…"
    : "Press Create to generate the link"

  return createPortal(
    <AnimatePresence>
      {open && (
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
          className="fixed bottom-0 left-0 right-0 z-40 mb-8 flex max-h-[80dvh] w-full flex-col font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:mb-0 sm:max-h-[88dvh] sm:w-[420px] sm:max-w-[calc(100vw_-_2rem)] rounded-t-[18px] sm:rounded-[18px] bg-white dark:bg-[#121212] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] p-1.5"
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)" }}
        >
          <div className="flex shrink-0 items-start justify-between px-2.5 pt-1.5 pb-2">
            <div className="flex min-w-0 flex-col">
              <h3 className="text-[15px] font-semibold tracking-tight text-[#111] dark:text-[#f0f0f0]" style={TITLE_FONT}>
                New funnel
              </h3>
              <p className="text-[12px] text-[#8b8b90] dark:text-[#8b9099]">
                One-time drop link
              </p>
            </div>
            <SecondaryButton
              variant="ghost"
              iconOnly
              size="xs"
              onClick={onClose}
              aria-label="Close"
              style={{ height: 28, width: 28, borderRadius: 9999 }}
            >
              <MIcon name="close" size={18} />
            </SecondaryButton>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-0.5 [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {error && (
              <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                {error}
              </AlertMessage>
            )}

            {!link ? (
              <>
                <div className={`${CARD} px-3.5 py-3`}>
                  <p className="text-[12px] leading-relaxed text-[#8b8b90] dark:text-[#8b9099]">
                    Whoever opens the link can drop a single file into your inbox. It&apos;s encrypted in their browser, so
                    only you can open it.
                  </p>
                </div>

                <div className={`${CARD} overflow-hidden`}>
                  <div className="px-3.5 py-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <MIcon name="link" size={16} className="text-[#8b8b90] dark:text-[#8b9099]" />
                      <span className="text-[13px] font-medium text-[#333] dark:text-[#e3e3e3]">Custom link</span>
                    </div>
                    <TextInput
                      size="md"
                      fullWidth
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="my-funnel"
                      onKeyDown={(e) => { if (e.key === "Enter") create() }}
                      leading={<span className="text-[13px] shrink-0">/funnel/</span>}
                      style={{ paddingLeft: 4 }}
                    />
                    <p className="mt-1.5 text-[11px] text-[#9a9aa0] dark:text-[#6b6b6b]">
                      Optional. Leave it empty for a random link.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight text-[#111] dark:text-[#f0f0f0]">{link}</p>
                    <p className="mt-0.5 text-[12px] text-[#8b8b90] dark:text-[#8b9099]">
                      {copied ? "Copied to your clipboard" : "Copy it before you close this tray"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-1.5 shrink-0 rounded-[12px] bg-[#f2f2f4] dark:bg-[rgba(255,255,255,0.02)] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] p-2">
            <div className="flex items-center gap-3 px-1.5 pb-2.5 pt-1">
              {creating && (
                <span className="text-[#666] dark:text-[#8b9099]">
                  <LoadingSvg size={22} />
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-tight text-[#111] dark:text-[#f0f0f0]">{footerTitle}</span>
                <span className="line-clamp-2 text-[12px] text-[#8b8b90] dark:text-[#8b9099]">{footerSub}</span>
              </div>
            </div>

            {!link ? (
              <div className="flex items-center gap-1.5">
                <SecondaryButton
                  size="sm"
                  onClick={onClose}
                  className="flex-1"
                  style={{ height: 36, borderRadius: 9 }}
                >
                  Cancel
                </SecondaryButton>
                <ShineButton
                  size="sm"
                  onClick={create}
                  disabled={creating}
                  className="flex-1"
                  style={{ height: 36, borderRadius: 9, gap: 6 }}
                >
                  <MIcon name="add_link" size={16} />
                  Create
                </ShineButton>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <SecondaryButton
                  size="sm"
                  onClick={() => { setLink(""); setCustomSlug(""); setCopied(false) }}
                  className="flex-1"
                  style={{ height: 36, borderRadius: 9 }}
                >
                  New
                </SecondaryButton>
                <ShineButton
                  size="sm"
                  onClick={copy}
                  className="flex-1"
                  color={copied ? "#059669" : undefined}
                  hoverColor={copied ? "#047857" : undefined}
                  style={{ height: 36, borderRadius: 9, gap: 6 }}
                >
                  <MIcon name={copied ? "check" : "content_copy"} size={16} />
                  {copied ? "Copied" : "Copy link"}
                </ShineButton>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
