"use client"

import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
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
              404 Not Found
            </h2>
          </div>
          <p className="text-[14px] text-[#898e97] mb-8 leading-relaxed text-left">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3">
            <Button
              variant="landing-primary"
              onClick={() => { window.location.href = "/manage/files" }}
              className="flex-1"
            >
              Upload a file
            </Button>
            <Button
              variant="landing-secondary"
              onClick={() => { window.location.href = "/" }}
              className="flex-1"
            >
              Home
            </Button>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
