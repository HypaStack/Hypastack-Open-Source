"use client"

import { Table, Checkbox } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { type FileItem } from "@/hooks/useManage"
import { getFileIconForType } from "./_helpers"
import { formatBytes } from "@/lib/format"

export function ListView({
  files,
  selectedFiles,
  onToggleSelect,
  onContextMenu,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  onToggleSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label="Files">
          <Table.Header>
            <Table.Column className="w-10" />
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column className="w-28 text-right">Size</Table.Column>
          </Table.Header>
          <Table.Body>
            {files.map((file) => (
              <Table.Row key={file.id} onContextMenu={(e) => onContextMenu(e, file.id)}>
                <Table.Cell>
                  <Checkbox
                    isSelected={selectedFiles.has(file.id)}
                    onChange={() => onToggleSelect(file.id)}
                    aria-label={`Select ${file.name}`}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </Table.Cell>
                <Table.Cell>
                  <div
                    className="flex items-center gap-2 min-w-0 cursor-pointer"
                    onClick={() => onToggleSelect(file.id)}
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
