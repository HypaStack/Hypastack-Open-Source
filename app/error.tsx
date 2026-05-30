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
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[20px] border border-[#2c2c30] bg-[#1f1f1f] p-8 sm:p-12 text-center max-w-md w-full shadow-2xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#2c2c30] bg-[#1c1c1c] mx-auto mb-5">
            <MIcon name="error" className="text-[#e5484d]" size={28} />
          </div>
          <h1 className="text-[clamp(28px,5vw,40px)] font-bold tracking-tight text-foreground mb-3 leading-tight">
            Something went wrong
          </h1>
          <p className="text-[15px] text-[#7a7a80] mb-8 leading-relaxed">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              onClick={reset}
              className="w-full sm:w-auto rounded-[10px] bg-[#e0e0e0] px-6 py-3.5 text-[15px] font-semibold text-[#111111] transition-all hover:bg-white text-center"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto rounded-[10px] border border-[#2c2c30] bg-transparent px-6 py-3.5 text-[15px] font-medium text-[#a1a1aa] transition-all hover:border-[#48484b] hover:text-foreground hover:bg-[#1c1c1c] text-center"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </section>

      <div className="relative px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5 lg:px-8 lg:pt-6 lg:pb-6">
        <Footer />
      </div>
    </main>
  )
}
