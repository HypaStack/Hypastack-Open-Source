"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import Cropper, { type Area } from "react-easy-crop"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { AVATAR_MAX_DIMENSION } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"

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
      const fd = new FormData()
      fd.append("avatar", cleanFile)

      onClose()

      apiFetch("/api/v2/auth/upload-avatar", {
        method: "POST",
        body: fd,
      }).then(res => {
        if (res.ok) onUploadSuccess()
      }).catch(console.error)

    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] flex flex-col bg-[#f0f0f0] dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] sm:rounded-[20px]"
        style={{
          boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
          padding: 4,
        }}
      >
        <div className="relative w-full flex flex-col bg-white dark:bg-[#151515] rounded-[16px] overflow-hidden">
        <div className="relative w-full overflow-hidden" style={{ height: 400 }}>
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

        <div className="flex gap-3 px-4 py-4">
          <SecondaryButton size="md" onClick={onClose} className="flex-1">
            Cancel
          </SecondaryButton>
          <ShineButton size="md" onClick={handleUpload} className="flex-1">
            Save
          </ShineButton>
        </div>
        </div>
      </motion.div>
    </div>
  )
}
