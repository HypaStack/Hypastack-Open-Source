"use client"

import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6">
            <div className="flex items-center gap-3 mb-3">
              <MIcon name="error" className="text-red-500" size={28} />
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
      </section>

      <Footer />
    </main>
  )
}
