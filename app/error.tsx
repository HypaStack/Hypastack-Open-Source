"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"

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
    <main className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div style={{ borderRadius: 20, backgroundColor: '#ffffff', border: '1px solid #e5e5e5', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ borderRadius: 18, padding: 24 }}>
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={26} />
                <h2 className="text-[19px] font-semibold text-[#111] tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                  Something went wrong
                </h2>
              </div>
              <p className="text-[13px] text-[#888] mb-6 leading-relaxed text-left">
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </p>
              {error?.digest && (
                <p className="text-[11px] text-[#bbb] font-mono mb-5 bg-[#f5f5f5] border border-[#ebebeb] rounded-lg px-3 py-2">
                  ref: {error.digest}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="hover:bg-[#f0f0f0] active:scale-[0.97] transition-all duration-75 flex items-center justify-center flex-1"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#111', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
                >
                  Try Again
                </button>
                <Link
                  href="/"
                  className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 flex items-center justify-center flex-1"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#fff', backgroundColor: '#111' }}
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  )
}
