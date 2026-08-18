"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Button, Modal, toast } from "@heroui/react"
import { AVATAR_MAX_DIMENSION } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"

/** POSTs an avatar file as-is. Shared with the GIF path, which skips cropping. */
export async function uploadAvatar(file: File) {
  const fd = new FormData()
  fd.append("avatar", file)
  const res = await apiFetch("/api/v2/auth/upload-avatar", { method: "POST", body: fd })
  if (!res.ok) throw new Error("Upload failed")
}

export function AvatarCropperModal({
  imageSrc,
  file,
  onClose,
  onUploadSuccess,
}: {
  imageSrc: string
  file: File
  onClose: () => void
  onUploadSuccess: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUpload = async () => {
    if (!croppedAreaPixels) return

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("No 2d context")

      const image = new window.Image()
      image.src = imageSrc
      await new Promise((resolve, reject) => { 
        image.onload = resolve
        image.onerror = reject
      })

      const MAX = AVATAR_MAX_DIMENSION
      let w = croppedAreaPixels.width
      let h = croppedAreaPixels.height
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      canvas.width = w
      canvas.height = h

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        w,
        h
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("blob failed")), file.type === "image/png" ? "image/png" : "image/webp", 0.80)
      })

      const ext = file.type === "image/png" ? "png" : "webp"
      const uuid = (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16))
      const cleanFile = new File([blob], `${uuid}.${ext}`, { type: blob.type })

      onClose()

      const uploaded = uploadAvatar(cleanFile).then(onUploadSuccess)
      toast.promise(uploaded, {
        loading: "Updating profile picture…",
        success: "Profile picture updated",
        error: (err) => errorMessage(err, "Couldn't change your profile picture."),
      })
      uploaded.catch(() => {})
    } catch (e) {
      toast.danger("Couldn't change your profile picture.", { description: errorMessage(e) })
    }
  }

  return (
    <Modal isOpen onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Crop your picture</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 360 }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  zoomSpeed={0.25}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>Cancel</Button>
              <Button variant="primary" onPress={handleUpload}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
