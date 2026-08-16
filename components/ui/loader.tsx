"use client"

import { Spinner } from "@heroui/react"

interface LoaderProps {
  /** Diameter in px. */
  size?: number | string
  /** Defaults to currentColor so it inherits the surrounding text colour. */
  color?: string
}

/**
 * The single app-wide loading spinner — HeroUI's real Spinner component, sized
 * to an exact px diameter (HeroUI's own size scale is sm/md/lg/xl only) so it
 * drops into any spot the old fixed-size spinner used to.
 */
export function Loader({ size = 28, color = "currentColor" }: LoaderProps) {
  return <Spinner style={{ width: size, height: size, color }} />
}
