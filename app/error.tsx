"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#08090a] px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-md flex-col items-center"
      >
        <Link href="/" className="mb-6 inline-block hover:opacity-80 transition-opacity">
          <img
            src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
            alt="Hypastack"
            className="w-[52px] h-auto object-contain select-none"
            draggable={false}
          />
        </Link>

        <div className="w-full bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <MIcon name="error" className="text-red-500" size={20} />
            <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              Something went wrong
            </h2>
          </div>
          <p className="text-[14px] text-[#898e97] mb-6 leading-relaxed text-left">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error?.digest && (
            <p className="text-[11px] text-[#6b7075] font-mono mb-6 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2">
              ref: {error.digest}
            </p>
          )}
          <div className="flex gap-3">
            <ShineButton onClick={reset} className="flex-1">
              Try again
            </ShineButton>
            <SecondaryButton
              href="/"
              as={Link}
              size="lg"
              className="flex-1"
            >
              Home
            </SecondaryButton>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
