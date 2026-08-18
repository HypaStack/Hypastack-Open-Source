import type { MouseEventHandler } from "react"
import type { PressEvent } from "react-aria-components"

// PressEvent has no preventDefault/stopPropagation, shim no-ops them for onClick handlers that call them.
export function toPressHandler(onClick?: MouseEventHandler) {
  if (!onClick) return undefined
  return (_e: PressEvent) => {
    onClick({
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as Parameters<MouseEventHandler>[0])
  }
}
