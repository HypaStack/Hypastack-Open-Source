import { type CSSProperties } from "react"
import { Skeleton as HeroSkeleton } from "@heroui/react"

/** Neutral placeholder block. Shape it with className/style at the call site so
 *  a skeleton can mirror the real element's box exactly. Colour and shimmer come
 *  from HeroUI, so every skeleton in the app animates as one. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <HeroSkeleton className={`rounded-md ${className}`} style={style} />
}
