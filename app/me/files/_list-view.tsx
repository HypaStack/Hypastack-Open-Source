"use client"

import { Table, Checkbox } from "@heroui/react"
import { type Selection } from "react-aria-components"
import { MIcon } from "@/components/ui/material-icon"
import { type FileItem } from "@/hooks/useManage"
import { getFileIconForType } from "./_helpers"
import { formatBytes } from "@/lib/format"

function SelectionCheckbox() {
  return (
    <Checkbox slot="selection">
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  )
}

export function ListView({
  files,
  selectedFiles,
  onSelectionChange,
  onContextMenu,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const handleSelectionChange = (keys: Selection) => {
    onSelectionChange(keys === "all" ? new Set(files.map((f) => f.id)) : new Set(Array.from(keys, String)))
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Files"
          selectionMode="multiple"
          selectedKeys={selectedFiles}
          onSelectionChange={handleSelectionChange}
        >
          <Table.Header>
            <Table.Column>
              <SelectionCheckbox />
            </Table.Column>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column className="text-right">Size</Table.Column>
          </Table.Header>
          <Table.Body>
            {files.map((file) => (
              <Table.Row key={file.id} id={file.id} onContextMenu={(e) => onContextMenu(e, file.id)}>
                <Table.Cell>
                  <SelectionCheckbox />
                </Table.Cell>
                <Table.Cell>
                  <div
                    className="flex items-center gap-2 min-w-0 cursor-pointer"
                    onDoubleClick={() => window.open(`/d/${file.id}`, "_blank")}
                  >
                    <MIcon name={getFileIconForType(file.contentType, file.name)} size={18} className="shrink-0 text-muted" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                    {!!file.burnOnRead && (
                      <span title="Burn on read" className="shrink-0 text-orange-400">
                        <MIcon name="local_fire_department" size={14} />
                      </span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-right text-muted">{formatBytes(file.size)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
