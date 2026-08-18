"use client"

import { useEffect, useState, use } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Card, Chip, Typography } from "@heroui/react"
import { ButtonLink } from "@/components/ui/button-link"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { SideAd } from "@/components/ui/side-ad"
import Link from "next/link"
import { motion } from "motion/react"
import { apiFetch } from "@/lib/http/fetch"
import { API_BASE } from "@/constants"

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024, s = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i]
}

function daysLeft(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
}

export default function BinViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [content, setContent] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiFetch(`/api/v2/bin/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setContent(data.content)
        setCreatedAt(data.createdAt)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const copyToClipboard = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRaw = () => {
    window.open(`${API_BASE}/bin/${id}/raw`, '_blank', 'noopener,noreferrer')
  }

  // Calculate days left for 180-day retention. `now` is pinned at mount so the
  // count stays stable across re-renders.
  const [now] = useState(() => Date.now())
  const retentionDays = createdAt ? 180 - Math.floor((now - new Date(createdAt).getTime()) / 864e5) : 180

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-background">
      <SideAd />
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img 
              src="https://r2.hypastack.com/cdn/hypaasset/hypastack.webp"
              className="select-none h-14 w-14 rounded-md object-contain" 
              alt="Hypastack" 
              draggable={false} 
            />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="transparent" className="bg-overlay border !border-solid border-white/10 rounded-[16px]">
              <Card.Header className="gap-2">
                <Card.Title className="text-xl">Paste not found</Card.Title>
                <Card.Description>
                  {error || "The paste you're looking for doesn't exist or has expired."}
                </Card.Description>
              </Card.Header>
              <Card.Footer className="gap-2">
                <ButtonLink href="/me/bin" as={Link} variant="primary" className="flex-1">
                  New Paste
                </ButtonLink>
                <ButtonLink href="/" as={Link} variant="tertiary" size="lg" className="flex-1">
                  Home
                </ButtonLink>
              </Card.Footer>
            </Card>
          </motion.div>
        )}

        {content !== null && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card variant="transparent" className="bg-overlay border !border-solid border-white/10 rounded-[16px]">
              <Card.Header className="flex-row items-center justify-between gap-3">
                <Card.Title className="text-lg break-all">{id}.txt</Card.Title>
                <div className="flex items-center gap-2 shrink-0">
                  <Chip size="sm" variant="soft" className="gap-1">
                    <MIcon name="schedule" size={14} />
                    ~{Math.max(0, retentionDays)} days
                  </Chip>
                  <Chip size="sm" variant="soft" className="uppercase tracking-wider text-[10px] font-semibold">TXT</Chip>
                  <Typography type="body-sm" color="muted">{fmtBytes(new Blob([content]).size)}</Typography>
                </div>
              </Card.Header>

              <Card.Footer className="gap-2">
                <Button variant="primary" onPress={copyToClipboard} className="flex-1" style={{ gap: 8 }}>
                  <MIcon name={copied ? "check" : "content_copy"} size={16} />
                  {copied ? "Copied" : "Copy to Clipboard"}
                </Button>
                <Button variant="tertiary" onPress={handleRaw} size="lg" isIconOnly aria-label="View Raw">
                  <MIcon name="code" size={18} />
                </Button>
              </Card.Footer>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  )
}
