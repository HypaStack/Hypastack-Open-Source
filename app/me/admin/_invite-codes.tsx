"use client"

import { useEffect, useState } from "react"
import { Button, InputGroup, Table } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { apiFetch } from "@/lib/http/fetch"
import { hypaConfirm, hypaToast, hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"

interface InviteCode {
  code: string
  usedBy: string | null
  usedAt: string | null
  createdAt: string
}

export function InviteCodesPanel() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null)
  const [count, setCount] = useState("1")
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    try {
      const res = await apiFetch("/api/v2/admin/invite-codes")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load invite codes")
      setCodes(data.codes)
    } catch (err) {
      hypaError(errorMessage(err))
    }
  }

  useEffect(() => { load() }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(count) || 1
    setGenerating(true)
    try {
      const res = await apiFetch("/api/v2/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: n }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate codes")
      hypaToast({ title: `Generated ${data.codes.length} code${data.codes.length === 1 ? "" : "s"}` })
      await load()
    } catch (err) {
      hypaError(errorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (code: string) => {
    const confirmed = await hypaConfirm({
      title: "Revoke this invite code?",
      description: "It can no longer be used to register. This only works on unused codes.",
      confirmText: "Revoke",
      destructive: true,
      onConfirm: async () => {
        const res = await apiFetch(`/api/v2/admin/invite-codes/${code}`, { method: "DELETE" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to revoke code")
      },
    })
    if (confirmed) await load()
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    hypaToast({ title: "Copied" })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#e3e3e3]">Invite codes</h2>
        <form onSubmit={handleGenerate}>
          <InputGroup>
            <InputGroup.Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              aria-label="How many codes to generate"
              className="w-16"
            />
            <InputGroup.Suffix className="p-0.5">
              <Button type="submit" variant="primary" size="sm" isDisabled={generating}>
                {generating ? "Generating..." : "Generate"}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
        </form>
      </div>

      {codes === null ? (
        <div className="py-8 flex justify-center"><LoadingSvg /></div>
      ) : codes.length === 0 ? (
        <p className="text-[13.5px] text-[#898e97]">No invite codes yet, generate some above.</p>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Invite codes">
              <Table.Header>
                <Table.Column isRowHeader>Code</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column className="w-20 text-right">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {codes.map((c) => (
                  <Table.Row key={c.code} id={c.code}>
                    <Table.Cell><code className="text-[13px] font-mono">{c.code}</code></Table.Cell>
                    <Table.Cell>
                      {c.usedBy ? (
                        <span className="text-muted">used by {c.usedBy}</span>
                      ) : (
                        <span className="text-success">unused</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="secondary" size="sm" isIconOnly aria-label="Copy code" onPress={() => handleCopy(c.code)}>
                          <MIcon name="content_copy" size={14} />
                        </Button>
                        {!c.usedBy && (
                          <Button variant="danger-soft" size="sm" isIconOnly aria-label="Revoke code" onPress={() => handleRevoke(c.code)}>
                            <MIcon name="delete" size={14} />
                          </Button>
                        )}
                      </div>
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
