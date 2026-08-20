"use client"

import Link from "next/link"
import { Typography, linkVariants } from "@heroui/react"

export default function NotFoundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 sm:px-6">
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center font-bold text-foreground opacity-5 select-none pointer-events-none"
        style={{ fontSize: "clamp(220px, 40vw, 440px)" }}
      >
        404
      </span>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <Typography type="h1" className="text-foreground text-6xl sm:text-7xl">OOOPS!</Typography>
        <Typography type="body" color="muted" className="mt-4 text-2xl">
          This is not the page you are looking for.
        </Typography>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-12 px-4 text-center">
        <Typography type="body" color="muted" className="text-xl">
          Here&apos;s some helpful links instead:
        </Typography>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-lg">
          <Link href="/me/storage" className={linkVariants().base()}>Dashboard</Link>
          <Link href="/" className={linkVariants().base()}>Home</Link>
          <Link href="https://docs.hypastack.com/api-reference/overview" target="_blank" rel="noopener noreferrer" className={linkVariants().base()}>Developer API</Link>
        </div>
      </div>
    </main>
  )
}
