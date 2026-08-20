"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { AlertMessage } from "@/components/ui/alert-message"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { Button, Card, TextField, InputGroup } from "@heroui/react"
import { generateWrappedFunnelKeypair } from "@/lib/security/funnelCrypto"
import { apiFetch } from "@/lib/http/fetch"

const PAD = "px-3"
const SECTION = "text-[15px] font-semibold text-foreground"

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

  const footerTitle = link ? "Request ready" : "New request"
  const footerSub = link
    ? "Share the link, it works once, then closes."
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
          className="fixed bottom-0 left-0 right-0 z-40 mb-8 flex max-h-[80dvh] w-full flex-col font-sans sm:bottom-4 sm:right-4 sm:left-auto sm:mb-0 sm:max-h-[88dvh] sm:w-[420px] sm:max-w-[calc(100vw_-_2rem)]"
        >
          <Card
            variant="transparent"
            className="!p-0 !gap-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[16px] border !border-solid border-white/10 bg-overlay sm:rounded-[16px]"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)" }}
          >
            <Card.Header className="flex-row shrink-0 items-center justify-between gap-3 px-3 pt-3 pb-2">
              <div className="flex min-w-0 flex-col">
                <Card.Title className="text-lg">New request</Card.Title>
                <Card.Description>One-time drop link</Card.Description>
              </div>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                onPress={onClose}
                aria-label="Close"
              >
                <MIcon name="close" size={18} />
              </Button>
            </Card.Header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {error && (
                <div className={`${PAD} pb-2`}>
                  <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                    {error}
                  </AlertMessage>
                </div>
              )}

              {!link ? (
                <div>
                  <div className={`${PAD} pt-3 pb-1`}>
                    <span className={SECTION}>How it works</span>
                  </div>
                  <div className={`${PAD} pb-3`}>
                    <p className="text-[13px] leading-relaxed text-muted">
                      Whoever opens the link can drop a single file into your inbox. It&apos;s encrypted in their
                      browser, so only you can open it.
                    </p>
                  </div>

                  <div className={`${PAD} pt-1 pb-1`}>
                    <span className={SECTION}>Custom link</span>
                  </div>
                  <div className={`${PAD} pb-3`}>
                    <TextField
                      aria-label="Custom link"
                      value={customSlug}
                      onChange={(v) => setCustomSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                      onKeyDown={(e) => { if (e.key === "Enter") create() }}
                      maxLength={64}
                      className="w-full"
                    >
                      <InputGroup>
                        <InputGroup.Prefix>/funnel/</InputGroup.Prefix>
                        <InputGroup.Input placeholder="my-request" />
                      </InputGroup>
                    </TextField>
                    <p className="mt-1.5 text-[12px] text-muted">
                      Optional. Leave it empty for a random link.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`${PAD} py-3`}>
                  <p className="truncate text-[13px] font-medium leading-tight text-foreground">{link}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {copied ? "Copied to your clipboard" : "Copy it before you close this tray"}
                  </p>
                </div>
              )}
            </div>

            <Card.Footer className="flex-col items-stretch gap-0 border-t border-white/10 px-3 py-2.5">
              <div className="mb-2.5 flex items-center gap-2 px-0.5">
                {creating && (
                  <span className="shrink-0 text-muted">
                    <LoadingSvg size={18} />
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[16px] font-semibold leading-tight text-foreground">{footerTitle}</span>
                  <span className="line-clamp-1 text-[13px] leading-tight text-muted">{footerSub}</span>
                </div>
              </div>

              {!link ? (
                <div className="flex items-center justify-between gap-2">
                  <Button variant="tertiary" size="sm" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={create}
                    isDisabled={creating}
                    style={{ gap: 8 }}
                  >
                    <MIcon name="add_link" size={16} />
                    Create
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <Button variant="tertiary" size="sm" onPress={() => { setLink(""); setCustomSlug(""); setCopied(false) }}>
                    New
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={copy}
                    style={
                      copied
                        ? { gap: 8, ["--button-bg" as string]: "#059669", ["--button-bg-hover" as string]: "#047857" }
                        : { gap: 8 }
                    }
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={16} />
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                </div>
              )}
            </Card.Footer>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
