"use client"

import { useState } from "react"
import { Table, Checkbox, Button } from "@heroui/react"
import { type Selection, useDragAndDrop } from "react-aria-components"
import { MIcon } from "@/components/ui/material-icon"
import { type FileItem, type FolderItem } from "@/hooks/useManage"
import { getFileIconForType } from "./_helpers"
import { formatBytes } from "@/lib/format"

function SelectionCheckbox() {
  return (
    <Checkbox slot="selection" className="h-[26px] justify-center">
      <Checkbox.Content>
        <Checkbox.Control className="border-white/50 bg-white/10">
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  )
}

type Row =
  | { kind: "folder"; folder: FolderItem; depth: number; hasChildren: boolean }
  | { kind: "file"; file: FileItem; depth: number }

export function ListView({
  folders,
  files,
  allFolders,
  allFiles,
  selectedIds,
  onSelectionChange,
  onOpenFolder,
  onDeleteFolder,
  onMoveFiles,
  onContextMenu,
}: {
  folders: FolderItem[]
  files: FileItem[]
  allFolders: FolderItem[]
  allFiles: FileItem[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onOpenFolder: (id: string) => void
  onDeleteFolder: (id: string) => void
  onMoveFiles: (fileIds: string[], folderId: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Folders expand in place to preview their contents without navigating away —
  // children come from the full (unfiltered) collections already in memory.
  const rows: Row[] = []
  const addFolder = (folder: FolderItem, depth: number) => {
    const childFolders = allFolders.filter((f) => f.parentId === folder.id)
    const childFiles = allFiles.filter((f) => f.folderId === folder.id)
    rows.push({ kind: "folder", folder, depth, hasChildren: childFolders.length > 0 || childFiles.length > 0 })
    if (expandedFolders.has(folder.id)) {
      childFolders.forEach((f) => addFolder(f, depth + 1))
      childFiles.forEach((f) => rows.push({ kind: "file", file: f, depth: depth + 1 }))
    }
  }
  folders.forEach((f) => addFolder(f, 0))
  files.forEach((f) => rows.push({ kind: "file", file: f, depth: 0 }))

  const allRowIds = rows.map((r) => (r.kind === "folder" ? r.folder.id : r.file.id))

  const handleSelectionChange = (keys: Selection) => {
    onSelectionChange(keys === "all" ? new Set(allRowIds) : new Set(Array.from(keys, String)))
  }

  // Drag files onto a folder row to move them — no dialog. Folder rows are the
  // only valid drop targets, and only file rows produce drag items.
  const fileIds = new Set(rows.filter((r) => r.kind === "file").map((r) => r.file.id))
  const folderIds = new Set(rows.filter((r) => r.kind === "folder").map((r) => r.folder.id))

  const { dragAndDropHooks } = useDragAndDrop({
    // Dragging an unselected row drags just that row; dragging a selected one
    // brings the whole selection along, minus any folders (no move endpoint).
    getItems: (keys) => {
      const dragged = [...keys].map(String).filter((id) => fileIds.has(id))
      return dragged.map((id) => ({ "text/plain": id }))
    },
    acceptedDragTypes: ["text/plain"],
    shouldAcceptItemDrop: (target) => folderIds.has(String(target.key)),
    onItemDrop: async (e) => {
      const ids = await Promise.all(
        e.items.map((item) => (item.kind === "text" ? item.getText("text/plain") : Promise.resolve("")))
      )
      const moved = ids.filter(Boolean)
      if (moved.length > 0) onMoveFiles(moved, String(e.target.key))
    },
  })

  return (
    <Table className="-mr-1 -mb-1">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Files and folders"
          selectionMode="multiple"
          selectedKeys={selectedIds}
          onSelectionChange={handleSelectionChange}
          dragAndDropHooks={dragAndDropHooks}
        >
          <Table.Header>
            <Table.Column className="w-10 pr-2 py-2">
              <SelectionCheckbox />
            </Table.Column>
            {/* pl-6 = the rows' chevron column (w-7 with -mx-1 = 20px) plus the
                gap-1 after it, so "Name" starts exactly where the names do. */}
            <Table.Column isRowHeader className="py-2 pl-6">Name</Table.Column>
            <Table.Column className="w-28 text-right py-2">Size</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row) =>
              row.kind === "folder" ? (
                <Table.Row key={`folder-${row.folder.id}`} id={row.folder.id} className="group">
                  <Table.Cell className="w-10 pr-2 py-2">
                    <SelectionCheckbox />
                  </Table.Cell>
                  <Table.Cell className="py-2">
                    <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: row.depth * 20 }}>
                      {row.hasChildren ? (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); toggleExpanded(row.folder.id) }}
                          aria-label={expandedFolders.has(row.folder.id) ? `Collapse ${row.folder.name}` : `Expand ${row.folder.name}`}
                          className="flex items-center justify-center h-5 w-7 -mx-1 shrink-0 text-muted hover:text-foreground transition-colors"
                        >
                          <MIcon name={expandedFolders.has(row.folder.id) ? "expand_more" : "chevron_right"} size={16} />
                        </button>
                      ) : (
                        <span className="h-5 w-7 -mx-1 shrink-0" />
                      )}
                      <div className="flex items-center gap-2 min-w-0 cursor-pointer" onDoubleClick={() => onOpenFolder(row.folder.id)}>
                        <MIcon name="folder" size={14} className="shrink-0 text-muted" />
                        <span className="truncate font-medium" title={row.folder.name}>{row.folder.name}</span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="w-28 text-right py-2">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        isIconOnly
                        size="sm"
                        style={{ height: 20, width: 26 }}
                        onPress={() => onDeleteFolder(row.folder.id)}
                        aria-label={`Delete folder ${row.folder.name}`}
                      >
                        <MIcon name="delete" size={16} />
                      </Button>
                    </span>
                  </Table.Cell>
                </Table.Row>
              ) : (
                <Table.Row
                  key={`file-${row.file.id}`}
                  id={row.file.id}
                  onContextMenu={(e) => onContextMenu(e, row.file.id)}
                >
                  <Table.Cell className="w-10 pr-2 py-2">
                    <SelectionCheckbox />
                  </Table.Cell>
                  <Table.Cell className="py-2">
                    {/* The empty span stands in for the folder rows' expand
                        chevron, so file and folder names share one column. */}
                    <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: row.depth * 20 }}>
                      <span className="h-5 w-7 -mx-1 shrink-0" />
                      <div
                        className="flex items-center gap-2 min-w-0 cursor-pointer"
                        onDoubleClick={() => window.open(`/d/${row.file.id}`, "_blank")}
                      >
                        <MIcon name={getFileIconForType(row.file.contentType, row.file.name)} size={14} className="shrink-0 text-muted" />
                        <span className="truncate" title={row.file.name}>{row.file.name}</span>
                        {!!row.file.burnOnRead && (
                          <span title="Burn on read" className="shrink-0 text-orange-400">
                            <MIcon name="local_fire_department" size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="w-28 text-right text-muted py-2">{formatBytes(row.file.size)}</Table.Cell>
                </Table.Row>
              )
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
