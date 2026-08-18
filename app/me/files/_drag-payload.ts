import type { DropItem } from "react-aria-components"

/** The type a dragged item id travels under. */
export const DRAG_TYPE = "text/plain"

export interface DraggedItem {
  id: string
  kind: "file" | "folder"
}

export function encodeDragItem(id: string, kind: "file" | "folder"): string {
  return `${kind}:${id}`
}

function decodeDragItem(raw: string): DraggedItem | null {
  const idx = raw.indexOf(":")
  if (idx === -1) return null
  const kind = raw.slice(0, idx)
  const id = raw.slice(idx + 1)
  if ((kind !== "file" && kind !== "folder") || !id) return null
  return { id, kind }
}

/** Parses a raw newline-joined dataTransfer string (native HTML5 drop) into items. */
export function decodeDroppedIds(raw: string): DraggedItem[] {
  return raw
    .split("\n")
    .map((line) => decodeDragItem(line.trim()))
    .filter((item): item is DraggedItem => item !== null)
}

/**
 * Pulls dragged item ids back out of a drop payload. Reads whatever text type
 * the payload actually carries rather than assuming text/plain, a drag started
 * from a collection doesn't always advertise it.
 */
export async function readDroppedItems(items: readonly DropItem[]): Promise<DraggedItem[]> {
  const out: DraggedItem[] = []
  for (const item of items) {
    if (item.kind !== "text") continue
    const type = item.types.has(DRAG_TYPE) ? DRAG_TYPE : [...item.types][0]
    if (!type) continue
    const decoded = decodeDragItem(await item.getText(type))
    if (decoded) out.push(decoded)
  }
  return out
}
