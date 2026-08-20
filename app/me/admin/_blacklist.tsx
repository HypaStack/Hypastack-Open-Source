"use client"

import { useEffect, useState } from "react"
import { Button, Card, Spinner, Table, Typography } from "@heroui/react"
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
    <Card>
      <Card.Header>
        <Card.Title>Blacklisted IPs</Card.Title>
        <Card.Description>
          Stored hashed, never raw. A blacklisted IP can neither sign in nor register.
        </Card.Description>
      </Card.Header>

      <Card.Content className="gap-0">
        {entries === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Blacklisted IPs">
                <Table.Header>
                  <Table.Column isRowHeader>IP hash</Table.Column>
                  <Table.Column>Reason</Table.Column>
                  <Table.Column>Blacklisted</Table.Column>
                  <Table.Column className="w-28 text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <Typography type="body-sm" color="muted" className="block py-10 text-center">
                      Nobody&apos;s blacklisted right now.
                    </Typography>
                  )}
                >
                  {entries.map((e) => (
                    <Table.Row key={e.ipHash} id={e.ipHash}>
                      <Table.Cell className="py-2">{e.ipHash}</Table.Cell>
                      <Table.Cell className="py-2">
                        <Typography type="body-sm" color="muted">{e.reason ?? "no reason logged"}</Typography>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <Typography type="body-sm" color="muted">
                          {new Date(e.createdAt).toLocaleString()}
                        </Typography>
                      </Table.Cell>
                      <Table.Cell className="py-2">
                        <Button variant="secondary" size="sm" className="float-right" onPress={() => handleRemove(e.ipHash)}>
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
      </Card.Content>
    </Card>
  )
}
