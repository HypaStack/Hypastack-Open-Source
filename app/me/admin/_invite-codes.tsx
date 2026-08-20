"use client"

import { useEffect, useState } from "react"
import {
  Button, ButtonGroup, Card, Chip, Form, Input, Label, NumberField,
  Spinner, Table, TextField, Typography,
} from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
import { apiFetch } from "@/lib/http/fetch"
import { hypaConfirm, hypaToast, hypaError } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"

interface InviteCode {
  code: string
  maxUses: number
  usesCount: number
  redeemedBy: string[]
  createdAt: string
}

export function InviteCodesPanel() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null)
  const [customCode, setCustomCode] = useState("")
  const [count, setCount] = useState(1)
  const [maxUses, setMaxUses] = useState(1)
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
    setGenerating(true)
    try {
      const body: Record<string, unknown> = { maxUses }
      // a custom code is always exactly one code, count only applies to random ones
      if (customCode.trim()) body.code = customCode.trim()
      else body.count = count
      const res = await apiFetch("/api/v2/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate codes")
      hypaToast({ title: `Generated ${data.codes.length} code${data.codes.length === 1 ? "" : "s"}` })
      setCustomCode("")
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
      description: "It can no longer be used to register. Past redemptions on it stay on record.",
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
    <Card>
      <Card.Header>
        <Card.Title>Invite codes</Card.Title>
        <Card.Description>
          Leave the code blank for a random one. Each code works until it hits its max uses.
        </Card.Description>
      </Card.Header>

      <Card.Content className="gap-4">
        <Form onSubmit={handleGenerate} className="flex flex-row flex-wrap items-end gap-3">
          <TextField value={customCode} onChange={setCustomCode} maxLength={64} className="w-56">
            <Label>Code</Label>
            <Input placeholder="random if blank" spellCheck={false} autoComplete="off" />
          </TextField>

          <NumberField value={maxUses} onChange={setMaxUses} minValue={1} maxValue={100000} className="w-36">
            <Label>Max uses</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          {!customCode.trim() && (
            <NumberField value={count} onChange={setCount} minValue={1} maxValue={100} className="w-36">
              <Label>How many</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          )}

          <Button type="submit" variant="primary" isDisabled={generating}>
            {generating ? <Spinner size="sm" /> : <MIcon name="add" size={16} />}
            Generate
          </Button>
        </Form>

        {codes === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Invite codes">
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Uses</Table.Column>
                  <Table.Column>Last redeemed by</Table.Column>
                  <Table.Column>Created</Table.Column>
                  <Table.Column className="w-28 text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <Typography type="body-sm" color="muted" className="block py-10 text-center">
                      No invite codes yet, generate some above.
                    </Typography>
                  )}
                >
                  {codes.map((c) => {
                    const spent = c.usesCount >= c.maxUses
                    return (
                      <Table.Row key={c.code} id={c.code}>
                        <Table.Cell className="py-2">{c.code}</Table.Cell>
                        <Table.Cell className="py-2">
                          <Chip size="sm" variant="soft" color={spent ? "default" : "success"}>
                            {c.usesCount}/{c.maxUses}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell className="py-2">
                          <Typography type="body-sm" color="muted">
                            {c.redeemedBy.at(-1) ?? "nobody yet"}
                          </Typography>
                        </Table.Cell>
                        <Table.Cell className="py-2">
                          <Typography type="body-sm" color="muted">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </Typography>
                        </Table.Cell>
                        <Table.Cell className="py-2">
                          {/* only Buttons go straight in here, ButtonGroup clones its direct children and the marker prop leaks onto anything else */}
                          <ButtonGroup variant="secondary" size="sm" className="float-right">
                            <Button isIconOnly aria-label="Copy code" onPress={() => handleCopy(c.code)}>
                              <MIcon name="content_copy" size={14} />
                            </Button>
                            <Button isIconOnly aria-label="Revoke code" onPress={() => handleRevoke(c.code)}>
                              <MIcon name="delete" size={14} />
                            </Button>
                          </ButtonGroup>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card.Content>
    </Card>
  )
}
