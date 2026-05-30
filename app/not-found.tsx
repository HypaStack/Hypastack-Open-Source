"use client"

import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div style={{ borderRadius: 20, backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ backgroundColor: '#111111', borderRadius: 16, padding: 24 }}>
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-white tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                  404 Not Found
                </h2>
              </div>
              <p className="text-[13px] text-[#777] mb-6 leading-relaxed text-left">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/manage/files"
                  className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                >
                  Upload a file
                </Link>
                <Link
                  href="/"
                  className="hover:bg-[#313131] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#ccc', backgroundColor: '#171717' }}
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
