"use client"

import { Table, Checkbox } from "@heroui/react"
import { type Selection } from "react-aria-components"
import { formatBytes } from "@/lib/format"

export interface FunnelFileDto {
  id: string
  nameEncrypted: string
  wrappedKey: string
  wrappedPrivateKey: string
  fileSize: number
  contentType: string
  chunkSize: number | null
  totalParts: number | null
  createdAt: string
}

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

export function FunnelFileTable({
  files,
  names,
  selectedIds,
  onSelectionChange,
}: {
  files: FunnelFileDto[]
  names: Record<string, string>
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}) {
  const handleSelectionChange = (keys: Selection) => {
    onSelectionChange(keys === "all" ? new Set(files.map((f) => f.id)) : new Set(Array.from(keys, String)))
  }

  return (
    <Table className="-mr-1 -mb-1">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Received files"
          selectionMode="multiple"
          selectedKeys={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <Table.Header>
            <Table.Column className="w-10 pr-2 py-2">
              <SelectionCheckbox />
            </Table.Column>
            <Table.Column isRowHeader className="py-2 !pl-2">Name</Table.Column>
            <Table.Column className="w-28 text-right py-2">Size</Table.Column>
          </Table.Header>
          <Table.Body>
            {files.map((f) => {
              const name = names[f.id]
              return (
                <Table.Row key={f.id} id={f.id}>
                  <Table.Cell className="w-10 pr-2 py-2">
                    <SelectionCheckbox />
                  </Table.Cell>
                  <Table.Cell className="py-2 !pl-2">
                    <span className="truncate" title={name}>{name || "Decrypting…"}</span>
                  </Table.Cell>
                  <Table.Cell className="w-28 text-right text-muted py-2">{formatBytes(f.fileSize)}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
