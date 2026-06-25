"use client"

import { useUpload } from "./use-upload"
import { UploadTray } from "./upload-tray"
import { ResumePopup } from "./resume-popup"
import type { UploadZoneProps } from "./types"

export function UploadZone(props: UploadZoneProps) {
  const upload = useUpload(props)

  return (
    <>
      <input
        ref={upload.inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          upload.handleFiles(e.target.files)
          if (upload.inputRef.current) upload.inputRef.current.value = ""
        }}
      />

      <UploadTray {...upload} uploadType={props.uploadType ?? "files"} />

      <ResumePopup
        showResumePopup={upload.showResumePopup}
        setShowResumePopup={upload.setShowResumePopup}
        interruptedSession={upload.interruptedSession}
        resumeInputRef={upload.resumeInputRef}
        handleAbortUpload={upload.handleAbortUpload}
        handleResumeUpload={upload.handleResumeUpload}
        handleResumeFileSelected={upload.handleResumeFileSelected}
        state={upload.state}
      />
    </>
  )
}
