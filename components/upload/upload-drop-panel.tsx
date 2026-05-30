"use client"

import { MIcon } from "@/components/ui/material-icon"
import type { UploadState } from "./upload-types"

interface UploadDropPanelProps {
  state: UploadState
  dragActive: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadDropPanel({
  state,
  dragActive,
  inputRef,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  handleInputChange,
}: UploadDropPanelProps) {
  return (
    <div
      onDrop={state === "idle" ? handleDrop : undefined}
      onDragOver={state === "idle" ? handleDragOver : undefined}
      onDragLeave={state === "idle" ? handleDragLeave : undefined}
      onClick={state === "idle" ? () => inputRef.current?.click() : undefined}
      role={state === "idle" ? "button" : undefined}
      tabIndex={state === "idle" ? 0 : undefined}
      onKeyDown={(e) => {
        if (state === "idle" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={`group relative rounded-[20px] transition-all min-h-[520px] sm:min-h-[580px] md:min-h-[660px] w-full flex flex-col justify-end items-start px-5 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-12 ${ state === "idle" ? "cursor-pointer bg-[#171717] hover:bg-[#1f1f1f]" : "cursor-default bg-[#171717]" }`}
    >
      {/* Centered visual */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative h-44 w-44 opacity-[0.5]">
          <div className="absolute left-1/2 top-1/2 -translate-x-[60%] -translate-y-1/2 -rotate-12 h-36 w-28 rounded-[20px] bg-[#1f1f1f]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-[40%] -translate-y-[55%] rotate-6 h-36 w-28 rounded-[20px] bg-[#2c2c30] flex items-center justify-center">
            <MIcon name="file_copy" className="text-muted-foreground" size={48} />
          </div>
        </div>
      </div>

      {/* Bottom-left content */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center gap-1.5 text-foreground">
          <span className="text-lg font-medium sm:text-2xl">
            {dragActive ? "Release to" : "Drop anything here to"}
          </span>
          <span className="inline-flex items-center gap-1 text-lg font-semibold underline decoration-foreground underline-offset-4 sm:text-2xl">
            upload
            <MIcon name="expand_more" size={20} />
          </span>
        </div>

        <p className="mt-2 text-sm font-normal text-muted-foreground sm:text-base">
          Max 5 files · Folders auto-zip · 500MB per file
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
            disabled={state !== "idle" && state !== "selected"}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#2c2c30] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a3a3b] transition-colors disabled:cursor-not-allowed"
          >
            <MIcon name="cloud_upload" size={16} />
            Choose a file
          </button>
          <a
            href="/manage/files"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#2c2c30] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a3a3b] transition-colors"
          >
            <MIcon name="create_new_folder" size={16} />
            Browse files
          </a>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
