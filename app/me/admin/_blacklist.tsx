"use client"

import { useEffect, useState } from "react"
import { Button, Table } from "@heroui/react"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { apiFetch } from "@/lib/http/fetch"
import { hypaConfirm, hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"

interface BlacklistEntry {
  ipHash: string
  reason: string | null
  createdAt: string
}

export function BlacklistPanel() {
  const [entries, setEntries] = useState<BlacklistEntry[] | null>(null)

  const load = async () => {
    try {
      const res = await apiFetch("/api/v2/admin/blacklist")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load blacklist")
      setEntries(data.entries)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (ipHash: string) => {
    const confirmed = await hypaConfirm({
      title: "Remove this IP from the blacklist?",
      description: "They'll be able to sign in and register again.",
      confirmText: "Remove",
      onConfirm: async () => {
        const res = await apiFetch(`/api/v2/admin/blacklist/${ipHash}`, { method: "DELETE" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to remove from blacklist")
      },
    })
    if (confirmed) await load()
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#e3e3e3]">Blacklisted IPs</h2>

      {entries === null ? (
        <div className="py-8 flex justify-center"><LoadingSvg /></div>
      ) : entries.length === 0 ? (
        <p className="text-[13.5px] text-[#898e97]">Nobody's blacklisted right now.</p>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Blacklisted IPs">
              <Table.Header>
                <Table.Column isRowHeader>IP hash</Table.Column>
                <Table.Column>Reason</Table.Column>
                <Table.Column>Blacklisted</Table.Column>
                <Table.Column className="w-24 text-right">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {entries.map((e) => (
                  <Table.Row key={e.ipHash} id={e.ipHash}>
                    <Table.Cell className="py-1.5"><code className="text-[12.5px] font-mono">{e.ipHash}</code></Table.Cell>
                    <Table.Cell className="py-1.5 text-muted">{e.reason ?? "no reason logged"}</Table.Cell>
                    <Table.Cell className="py-1.5 text-muted">{new Date(e.createdAt).toLocaleString()}</Table.Cell>
                    <Table.Cell className="py-1.5 text-right">
                      <Button variant="secondary" size="sm" onPress={() => handleRemove(e.ipHash)}>
                        Remove
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </section>
  )
}
