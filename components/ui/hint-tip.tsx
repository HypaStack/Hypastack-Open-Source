"use client"

import { MIcon } from "@/components/ui/material-icon"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"

interface HintTipProps {
  id?: string
  text: string
  icon?: string
}

export function HintTip({ id, text, icon = "emoji_objects" }: HintTipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!id) {
      setIsVisible(true)
      return
    }
    const dismissed = localStorage.getItem(`hypastack_hint_${id}`)
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [id])

  const handleDismiss = () => {
    setIsVisible(false)
    if (id) {
      localStorage.setItem(`hypastack_hint_${id}`, "true")
    }
  }

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 text-[14px] font-medium text-[#333] bg-white border border-[#e5e5e5] pl-5 pr-3 py-2.5 rounded-[20px] w-[max-content] max-w-[90vw] z-40"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <MIcon name={icon} size={18} className="text-[#555] shrink-0" />
          <span className="mr-1">{text}</span>
          {id && (
            <button
              onClick={handleDismiss}
              className="ml-1 flex items-center justify-center hover:bg-[#f0f0f0] h-6 w-6 rounded-full transition-colors active:scale-95 text-[#999] hover:text-[#333]"
            >
              <MIcon name="remove" size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
