"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Chip, Modal, typographyVariants } from "@heroui/react"

/** Stands in for the Drive root, which has no folder id. */
const ROOT_KEY = "__root"

export interface MoveTarget {
  id: string
  name: string
  parentId: string | null
}

export interface TreeNode {
  id: string
  name: string
  depth: number
  /** Last child of its parent, draws an elbow instead of a tee. */
  isLast: boolean
  /** For each ancestor level, whether that ancestor was its parent's last child.
   *  Levels that weren't need a vertical line running past this row. */
  ancestorsLast: boolean[]
}

// Walks the folder tree depth-first, carrying the guide-line state each row
// needs to draw its own connectors.
export function toTree(folders: MoveTarget[]): TreeNode[] {
  const byParent = new Map<string | null, MoveTarget[]>()
  for (const f of folders) {
    const list = byParent.get(f.parentId) ?? []
    list.push(f)
    byParent.set(f.parentId, list)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name))

  const out: TreeNode[] = []
  const walk = (parentId: string | null, depth: number, ancestorsLast: boolean[]) => {
    const kids = byParent.get(parentId) ?? []
    kids.forEach((f, i) => {
      const isLast = i === kids.length - 1
      out.push({ id: f.id, name: f.name, depth, isLast, ancestorsLast })
      walk(f.id, depth + 1, [...ancestorsLast, isLast])
    })
  }
  walk(null, 0, [])
  return out
}

// Flattens the folder tree into display rows, deepest paths shown as "Parent / Child".
export function toPaths(folders: MoveTarget[]): { id: string; path: string }[] {
  const byId = new Map(folders.map(f => [f.id, f]))
  return folders
    .map(f => {
      const parts = [f.name]
      let parent = f.parentId
      while (parent) {
        const p = byId.get(parent)
        if (!p) break
        parts.unshift(p.name)
        parent = p.parentId
      }
      return { id: f.id, path: parts.join(" / ") }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function MoveDialog({
  count,
  folders,
  currentFolderId,
  rootLabel,
  onCancel,
  onMove,
}: {
  count: number
  folders: MoveTarget[]
  currentFolderId: string | null
  rootLabel: string
  onCancel: () => void
  onMove: (folderId: string | null) => Promise<void>
}) {
  const [target, setTarget] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  const rows = toPaths(folders)
  const isCurrent = target === currentFolderId

  const submit = async () => {
    setMoving(true)
    try {
      await onMove(target)
    } finally {
      setMoving(false)
    }
  }

  return (
    <Modal isOpen onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      {/* Not dismissable: a press anywhere inside was closing it, so only
          Cancel, the X and Esc close this one. */}
      <Modal.Backdrop isDismissable={false} variant="blur">
        <Modal.Container placement="center" size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={typographyVariants({ type: "h5" }).base()}>
                Move {count} {count === 1 ? "item" : "items"}
              </Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="max-h-[280px]">
              <p className="mb-2">Pick where they should end up.</p>
              <div className="flex flex-col gap-1">
                {[{ id: null as string | null, path: rootLabel }, ...rows].map((row) => {
                  const selected = target === row.id
                  return (
                    <Button
                      key={row.id ?? ROOT_KEY}
                      variant={selected ? "tertiary" : "ghost"}
                      fullWidth
                      onPress={() => setTarget(row.id)}
                      className="justify-start gap-2.5"
                      style={{ height: 40 }}
                    >
                      <MIcon name={row.id === null ? "home_storage" : "folder"} size={16} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-left">{row.path}</span>
                      {row.id === currentFolderId && (
                        <Chip size="sm" variant="soft" className="shrink-0">Current</Chip>
                      )}
                      {selected && <MIcon name="check" size={16} className="shrink-0" />}
                    </Button>
                  )
                })}
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="tertiary" isDisabled={moving} onPress={onCancel}>Cancel</Button>
              <Button variant="primary" isPending={moving} isDisabled={moving || isCurrent} onPress={submit}>
                <MIcon name="drive_file_move" size={15} className="shrink-0" />
                {moving ? "Moving…" : "Move here"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
