"use client"

import { AlertMessage } from "@/components/ui/alert-message"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#08090a] px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-md flex-col items-center"
      >
        <img
          src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
          alt="Hypastack"
          className="w-[52px] h-auto object-contain select-none mb-6"
          draggable={false}
        />

        <div className="w-full">
          <AlertMessage
            tone="error"
            icon={<MIcon name="info" size={16} style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }} />}
            style={{ marginBottom: 16 }}
          >
            The page you're looking for doesn't exist or has been moved.
          </AlertMessage>
          <div className="flex gap-3">
            <ShineButton
              onClick={() => { window.location.href = "/manage/files" }}
              className="flex-1"
            >
              Upload a file
            </ShineButton>
            <SecondaryButton
              size="lg"
              onClick={() => { window.location.href = "/" }}
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
