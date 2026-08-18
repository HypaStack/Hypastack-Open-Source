"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Alert, Button, Description, Input, Label, Modal, Switch, TextField, toast } from "@heroui/react"
import { apiFetch } from "@/lib/http/fetch"
import { V3_SCOPES, V3_SCOPE_LABELS, type V3Scope } from "@/lib/http/v3/scopes"
import { type CreatedApiKey } from "./api-key-types"

export function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<V3Scope[]>(["files.read"])
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setName("")
    setScopes(["files.read"])
    setCreated(null)
    setCopied(false)
  }, [open])

  const toggle = (scope: V3Scope) => {
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope])
  }

  const canSave = name.trim().length > 0 && scopes.length > 0 && !saving

  const createKey = async () => {
    const res = await apiFetch("/api/v2/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scopes }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || data?.error || "Couldn't create that key.")
    return data as CreatedApiKey
  }

  const handleCreate = () => {
    if (!canSave) return
    setSaving(true)
    const creating = createKey()
    toast.promise(creating, {
      loading: "Creating key…",
      success: "API key created",
      error: (err) => err instanceof Error ? err.message : "Couldn't reach the server. Try again.",
    })
    creating
      .then((key) => { setCreated(key); onCreated() })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{created ? "Copy your key now" : "New API key"}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            {created ? (
              <>
                <Modal.Body className="space-y-3">
                  <Alert status="warning">
                    <Alert.Content>
                      <Alert.Description>This is the only time you&apos;ll see it. Store it somewhere safe.</Alert.Description>
                    </Alert.Content>
                  </Alert>
                  <code className="block break-all">{created.key}</code>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      navigator.clipboard.writeText(created.key)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={15} />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="primary" onPress={onClose}>Done</Button>
                </Modal.Footer>
              </>
            ) : (
              <>
                <Modal.Body className="space-y-4">
                  <TextField value={name} onChange={setName} className="w-full" maxLength={60} autoFocus>
                    <Label>Key name</Label>
                    <Input placeholder="prod uploader" spellCheck={false} />
                    <Description>A name you&apos;ll recognise later.</Description>
                  </TextField>

                  <div className="space-y-2">
                    <p>What this key can do</p>
                    {V3_SCOPES.map((scope) => (
                      <Switch
                        key={scope}
                        isSelected={scopes.includes(scope)}
                        onChange={() => toggle(scope)}
                        className="w-full justify-between"
                      >
                        <Switch.Content>
                          <span>
                            <code>{scope}</code>
                            <span className="block">{V3_SCOPE_LABELS[scope]}</span>
                          </span>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    ))}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="tertiary" onPress={onClose}>Cancel</Button>
                  <Button variant="primary" isPending={saving} isDisabled={!canSave} onPress={handleCreate}>
                    {saving ? "Creating…" : "Create key"}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
