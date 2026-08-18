import type { MouseEventHandler } from "react"
import type { PressEvent } from "react-aria-components"

/**
 * HeroUI/RAC buttons fire `onPress` with a PressEvent, not a DOM MouseEvent, it has
 * no `preventDefault`/`stopPropagation`. Several call sites' onClick handlers call
 * those unconditionally (e.g. to cancel a Link's default nav, which doesn't apply
 * here since these are real <button> elements), so onPress is bridged through a
 * shim that no-ops those two methods instead of throwing.
 */
export function toPressHandler(onClick?: MouseEventHandler) {
  if (!onClick) return undefined
  return (_e: PressEvent) => {
    onClick({
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as Parameters<MouseEventHandler>[0])
  }
}
