"use client"

import { motion } from "motion/react"
import { useTheme } from "@/hooks/useTheme"

interface PageLogoProps {
  size?: number
  borderRadius?: number
  pulse?: boolean
  className?: string
  disableLayoutAnimation?: boolean
  darkSrc?: string
}

/**
 * Single shared logo component used across ALL pages.
 * layoutId="hypa-logo" tells Framer Motion to animate
 * this element between its positions when pages transition.
 * Render this ONCE per page — never render it multiple times on the same page.
 */
export function PageLogo({ size = 26, borderRadius = 6, pulse = false, className = "", disableLayoutAnimation = false, darkSrc }: PageLogoProps) {
  const { resolvedTheme } = useTheme()
  const src = darkSrc && resolvedTheme === "dark"
    ? darkSrc
    : "https://r2.hypastack.com/cdn/zvo7jefzshuu/logo-main.webp"

  return (
    <motion.img
      {...(!disableLayoutAnimation ? { layoutId: "hypa-logo" } : {})}
      initial={false}
      src={src}
      alt="Hypastack"
      animate={
        pulse
          ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }
          : { scale: 1, opacity: 1 }
      }
      transition={
        pulse
          ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 280, damping: 26 }
      }
      style={{ width: size, height: size, borderRadius, display: "block", flexShrink: 0, userSelect: "none", WebkitUserDrag: "none" } as any}
      className={`pointer-events-none ${className}`}
      draggable={false}
    />
  )
}
