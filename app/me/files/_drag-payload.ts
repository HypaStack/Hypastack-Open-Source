import type { DropItem } from "react-aria-components"

/** The type a dragged file id travels under. */
export const FILE_DRAG_TYPE = "text/plain"

/**
 * Pulls dragged file ids back out of a drop payload. Reads whatever text type
 * the payload actually carries rather than assuming text/plain — a drag started
 * from a collection doesn't always advertise it.
 */
export async function readDroppedIds(items: readonly DropItem[]): Promise<string[]> {
  const ids: string[] = []
  for (const item of items) {
    if (item.kind !== "text") continue
    const type = item.types.has(FILE_DRAG_TYPE) ? FILE_DRAG_TYPE : [...item.types][0]
    if (!type) continue
    ids.push(await item.getText(type))
  }
  return ids.filter(Boolean)
}
