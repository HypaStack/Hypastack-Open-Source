import { apiFetch } from "@/lib/http/fetch"
import { RESUME_MAX_CONCURRENT_CHUNKS } from "@/constants/upload"
import type { InterruptedSession } from "./types"

// Re-uploads only the missing parts of an interrupted multipart upload with a
// bounded worker pool, then finalizes. Pure transport: reports progress via the
// callback, throws on failure. The hook owns all the surrounding UI state.
export async function resumeMultipartUpload(
  file: File,
  session: InterruptedSession,
  onProgress: (pct: number) => void
): Promise<void> {
  const resumeRes = await apiFetch("/api/v2/upload-multipart/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId: session.fileId,
      uploadId: session.uploadId,
      totalParts: session.totalParts,
      chunkSize: session.chunkSize,
    }),
  })

  if (!resumeRes.ok) {
    const err = await resumeRes.json()
    throw new Error(err.error || "Resume failed")
  }

  const { uploadedParts, missingParts } = await resumeRes.json()

  const { importKeyFromBase64, readFileSlice, encryptChunk, uploadChunkToR2 } =
    await import("@/lib/storage/multipart")
  const encKey = await importKeyFromBase64(session.keyBase64)

  const chunkSize = session.chunkSize
  const allEtags: { partNumber: number; etag: string }[] = [...uploadedParts]

  const baseProgress = (uploadedParts.length / session.totalParts) * 100
  onProgress(baseProgress)

  let nextIdx = 0
  const chunkProgress = new Float64Array(missingParts.length)

  const reportProgress = () => {
    let done = 0
    for (let i = 0; i < chunkProgress.length; i++) done += chunkProgress[i]
    const missingBytes = missingParts.length * chunkSize
    const pct = baseProgress + (done / Math.max(missingBytes, 1)) * (100 - baseProgress)
    onProgress(Math.min(99, pct))
  }

  const worker = async () => {
    while (true) {
      const idx = nextIdx++
      if (idx >= missingParts.length) break

      const { partNumber, presignedUrl } = missingParts[idx]
      const start = (partNumber - 1) * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunkBytes = end - start

      const plaintext = await readFileSlice(file, start, end)
      const encrypted = await encryptChunk(encKey, plaintext)
      const etag = await uploadChunkToR2(presignedUrl, encrypted, (loaded, total) => {
        chunkProgress[idx] = (loaded / total) * chunkBytes
        reportProgress()
      })

      allEtags.push({ partNumber, etag })
      chunkProgress[idx] = chunkBytes
      reportProgress()
    }
  }

  const workerCount = Math.min(RESUME_MAX_CONCURRENT_CHUNKS, missingParts.length)
  const workers: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) workers.push(worker())
  await Promise.all(workers)

  allEtags.sort((a, b) => a.partNumber - b.partNumber)

  const completeRes = await apiFetch("/api/v2/upload-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId: session.fileId,
      uploadId: session.uploadId,
      parts: allEtags,
    }),
  })

  if (!completeRes.ok) {
    const err = await completeRes.json()
    throw new Error(err.error || "Completion failed")
  }

  onProgress(100)
}
