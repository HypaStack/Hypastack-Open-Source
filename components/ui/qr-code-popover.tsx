"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Popover, Button } from "@heroui/react"
import { MIcon } from "./material-icon"

interface QrCodePopoverProps {
  /** The share link to encode. Nothing renders until this is set. */
  url: string | undefined | null
  size?: number
  className?: string
}

/**
 * Icon-trigger popover with a QR code for a share link. Generated entirely in
 * the browser (the `qrcode` package, no network round trip) so the link never
 * leaves the device just to render a code for it — consistent with everything
 * else about how Hypastack handles share links.
 */
export function QrCodePopover({ url, size = 30, className }: QrCodePopoverProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    setError(false)
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: "#08090a", light: "#ffffff" },
    })
      .then((data) => { if (!cancelled) setDataUrl(data) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [open, url])

  if (!url) return null

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger className={className}>
        <Button variant="tertiary" size="sm" isIconOnly aria-label="Show QR code for this link" style={{ height: size, width: size }}>
          <MIcon name="qr_code_2" size={15} />
        </Button>
      </Popover.Trigger>
      <Popover.Content offset={10}>
        <Popover.Dialog className="w-[240px]">
          <Popover.Heading className="mb-3 text-[16px]">Scan to open this link</Popover.Heading>
          <div className="flex items-center justify-center rounded-xl bg-white p-3">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt="QR code for the share link" width={200} height={200} className="h-[200px] w-[200px]" />
            ) : error ? (
              <p className="p-6 text-center text-[12px] text-danger">Couldn&apos;t generate a QR code.</p>
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-black/10" />
            )}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
