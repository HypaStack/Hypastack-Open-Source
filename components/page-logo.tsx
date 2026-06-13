"use client"

import Image from "next/image"
import { useTheme } from "@/hooks/useTheme"

interface PageLogoProps {
  size?: number
  borderRadius?: number
  pulse?: boolean
  className?: string
  /** @deprecated No longer used - layout animation has been removed */
  disableLayoutAnimation?: boolean
  darkSrc?: string
}

export function PageLogo({ size = 26, borderRadius = 6, pulse = false, className = "", darkSrc }: PageLogoProps) {
  const { resolvedTheme } = useTheme()
  const src = darkSrc && resolvedTheme === "dark"
    ? darkSrc
    : "https://r2.hypastack.com/cdn/zvo7jefzshuu/logo-main.webp"

  return (
    <Image
      src={src}
      alt="Hypastack"
      width={size}
      height={size}
      priority
      unoptimized
      style={{ borderRadius, display: "block", flexShrink: 0, userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties}
      className={`pointer-events-none select-none${pulse ? " animate-pulse" : ""}${className ? ` ${className}` : ""}`}
      draggable={false}
    />
  )
}
