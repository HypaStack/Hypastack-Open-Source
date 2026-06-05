"use client"

import { MIcon } from "@/components/ui/material-icon"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"

export interface WalkthroughStep {
  text: string
  icon?: string
}

interface WalkthroughProps {
  id: string
  steps: WalkthroughStep[]
  currentStep: number
}

export function Walkthrough({ id, steps, currentStep }: WalkthroughProps) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const done = localStorage.getItem(`hypastack_wt_${id}`)
    if (done) setDismissed(true)
  }, [id])

  const handleSkip = useCallback(() => {
    setDismissed(true)
    localStorage.setItem(`hypastack_wt_${id}`, "true")
  }, [id])

  useEffect(() => {
    if (currentStep >= steps.length && !dismissed) {
      handleSkip()
    }
  }, [currentStep, steps.length, dismissed, handleSkip])

  if (!mounted || dismissed) return null

  const step = steps[Math.min(currentStep, steps.length - 1)]
  if (!step) return null

  const progress = Math.min(currentStep + 1, steps.length)
  const icon = step.icon || "emoji_objects"

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[14px] font-medium text-[#333] bg-white border border-[#e5e5e5] pl-5 pr-3 py-2.5 rounded-[20px] w-[max-content] max-w-[90vw] z-40"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        <MIcon name={icon} size={18} className="text-[#555] shrink-0" />
        <span className="mr-1">{step.text}</span>

        {/* Step counter pill */}
        <span className="text-[11px] font-semibold text-[#888] bg-[#f0f0f0] border border-[#e5e5e5] px-2 py-0.5 rounded-full shrink-0 tabular-nums">
          {progress}/{steps.length}
        </span>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="ml-0.5 flex items-center justify-center hover:bg-[#f0f0f0] h-6 w-6 rounded-full transition-colors active:scale-95 text-[#999] hover:text-[#333] shrink-0"
          title="Skip walkthrough"
        >
          <MIcon name="close" size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
