"use client"

import { MIcon } from "@/components/ui/material-icon"
import type { FileWithPreview } from "./upload-types"
import { TextInput } from "@/components/ui/text-input"
import { ToggleSwitch } from "@/components/ui/toggle-switch"

interface UploadOptionsPanelProps {
  burnOnRead: boolean
  setBurnOnRead: (v: boolean) => void
  customFilename: string
  setCustomFilename: (v: string) => void
  filenameError: string
  setFilenameError: (v: string) => void
  note: string
  setNote: (v: string) => void
  noteError: string
  setNoteError: (v: string) => void
  isMultiFile: boolean
  files: FileWithPreview[]
}

export function UploadOptionsPanel({
  burnOnRead,
  setBurnOnRead,
  customFilename,
  setCustomFilename,
  filenameError,
  setFilenameError,
  note,
  setNote,
  noteError,
  setNoteError,
  isMultiFile,
  files,
}: UploadOptionsPanelProps) {
  return (
    <div style={{ margin: '0 12px 8px', borderRadius: 6, backgroundColor: '#171717', padding: '4px' }}>
      {/* Burn toggle */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#222] transition-all duration-75"
        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 6 }}
        onClick={() => setBurnOnRead(!burnOnRead)}
      >
        <div className="flex items-center gap-2.5">
          <MIcon name="local_fire_department" size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 13, color: '#ccc' }}>Burn after download</span>
        </div>
        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
          <ToggleSwitch checked={burnOnRead} onChange={setBurnOnRead} width={34} height={20} aria-label="Burn after download" />
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />

      {/* Rename file */}
      {!isMultiFile && (
        <>
          <div style={{ padding: '6px 8px 4px' }}>
            <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
              <MIcon name="edit" size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>Rename file</span>
            </div>
            <TextInput
              type="text"
              value={customFilename}
              onChange={(e) => { setCustomFilename(e.target.value); setFilenameError("") }}
              placeholder={files[0]?.file.name || "example.pdf"}
              fullWidth
              size="sm"
            />
            {filenameError && <p className="mt-1 text-[11px] text-red-500" style={{ paddingLeft: 4 }}>{filenameError}</p>}
          </div>
          <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </>
      )}

      {/* Note */}
      <div style={{ padding: '6px 8px 6px' }}>
        <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
          <MIcon name="article" size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>Note</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteError("") }}
          placeholder="Optional message…"
          maxLength={100}
          rows={2}
          className="w-full placeholder:text-[#444] focus:outline-none focus:border-[rgba(255,255,255,0.12)] resize-none"
          style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 6, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#e3e3e3' }}
        />
        {noteError && <p className="mt-1 text-[11px] text-red-500" style={{ paddingLeft: 4 }}>{noteError}</p>}
      </div>
    </div>
  )
}
