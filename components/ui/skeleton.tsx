import { type CSSProperties } from "react"

/** Neutral placeholder block. Shape it with className/style at the call site so
 *  a skeleton can mirror the real element's box exactly. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[rgba(0,0,0,0.07)] dark:bg-[rgba(255,255,255,0.06)] ${className}`}
      style={style}
    />
  )
}
