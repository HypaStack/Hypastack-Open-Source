"use client"

import { useState } from "react"
import { Table, Checkbox, Button } from "@heroui/react"
import { type Selection } from "react-aria-components"
import { MIcon } from "@/components/ui/material-icon"
import { type FileItem, type FolderItem } from "@/hooks/useManage"
import { getFileIconForType } from "./_helpers"
import { formatBytes } from "@/lib/format"

function SelectionCheckbox() {
  return (
    <Checkbox slot="selection" className="h-[26px] justify-center">
      <Checkbox.Content>
        <Checkbox.Control className="border-white/30">
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

  return (
    <Table className="-mr-1 -mb-1">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Files and folders"
          selectionMode="multiple"
          selectedKeys={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <Table.Header>
            <Table.Column className="w-10 pr-2 py-2">
              <SelectionCheckbox />
            </Table.Column>
            <Table.Column isRowHeader className="py-2">Name</Table.Column>
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
                        <span className="h-5 w-5 shrink-0" />
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
                    <div
                      className="flex items-center gap-2 min-w-0 cursor-pointer"
                      style={{ paddingLeft: row.depth * 20 }}
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
