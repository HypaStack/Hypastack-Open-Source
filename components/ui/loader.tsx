import { LineSpinner } from "ldrs/react"
import "ldrs/react/LineSpinner.css"

interface LoaderProps {
  /** Diameter in px. */
  size?: number | string
  /** Line thickness in px. */
  stroke?: number | string
  speed?: number | string
  /** Defaults to currentColor so it inherits the surrounding text colour. */
  color?: string
}

/**
 * The single app-wide loading spinner (ldrs line-spinner). Use this for every
 * loading state; don't hand-roll spinners elsewhere.
 */
export function Loader({ size = 28, stroke = 2, speed = 1, color = "currentColor" }: LoaderProps) {
  return <LineSpinner size={size} stroke={stroke} speed={speed} color={color} />
}
