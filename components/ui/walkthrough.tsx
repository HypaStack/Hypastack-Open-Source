"use client"

import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"
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
        className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-2.5 text-[13px] sm:text-[14px] font-medium text-[#333] dark:text-[#e3e3e3] bg-white dark:bg-[#0e0f10] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] pl-4 sm:pl-5 pr-2.5 sm:pr-3 py-2.5 rounded-md w-max max-w-[calc(100vw-1.5rem)] sm:max-w-md z-40 text-center sm:text-left"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        <MIcon name={icon} size={18} className="text-[#555] dark:text-[#a1a1aa] shrink-0" />
        <span className="mr-1">{step.text}</span>

        {/* Step counter pill */}
        <span className="text-[11px] font-semibold text-[#888] dark:text-[#a1a1aa] bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.06)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full shrink-0 tabular-nums">
          {progress}/{steps.length}
        </span>

        {/* Skip button */}
        <SecondaryButton
          variant="ghost"
          iconOnly
          size="xs"
          onClick={handleSkip}
          className="ml-0.5"
          title="Skip walkthrough"
          aria-label="Skip walkthrough"
          style={{ height: 24, width: 24, borderRadius: 9999 }}
        >
          <MIcon name="close" size={14} />
        </SecondaryButton>
      </motion.div>
    </AnimatePresence>
  )
}
