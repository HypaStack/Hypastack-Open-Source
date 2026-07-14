
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getR2Client, getBucketName } from "@/lib/storage/r2"

export async function initiateMultipartUpload(opts: {
  r2Key: string
  contentType: string
  totalParts: number
}): Promise<{ uploadId: string; presignedUrls: string[] }> {
  const client = getR2Client()
  const bucket = getBucketName()

  const createCmd = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: opts.r2Key,
    ContentType: opts.contentType,
  })
  const createRes = await client.send(createCmd)
  const uploadId = createRes.UploadId!

  // Presigning is local HMAC work (no network), but each call still awaits
  // through the SDK's async middleware stack — sign all parts concurrently
  // instead of one at a time (a 5GB file is ~500 parts).
  const presignedUrls = await Promise.all(
    Array.from({ length: opts.totalParts }, (_, idx) => {
      const partCmd = new UploadPartCommand({
        Bucket: bucket,
        Key: opts.r2Key,
        UploadId: uploadId,
        PartNumber: idx + 1,
      })
      return getSignedUrl(client, partCmd, { expiresIn: 3600 })
    }),
  )

  return { uploadId, presignedUrls }
}

export async function getPresignedUrlsForParts(opts: {
  r2Key: string
  uploadId: string
  partNumbers: number[]
}): Promise<string[]> {
  const client = getR2Client()
  const bucket = getBucketName()

  return Promise.all(
    opts.partNumbers.map((partNum) => {
      const partCmd = new UploadPartCommand({
        Bucket: bucket,
        Key: opts.r2Key,
        UploadId: opts.uploadId,
        PartNumber: partNum,
      })
      return getSignedUrl(client, partCmd, { expiresIn: 3600 })
    }),
  )
}

export async function completeMultipartUpload(opts: {
  r2Key: string
  uploadId: string
  parts: { partNumber: number; etag: string }[]
}): Promise<void> {
  const client = getR2Client()
  const bucket = getBucketName()

  const cmd = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: opts.r2Key,
    UploadId: opts.uploadId,
    MultipartUpload: {
      Parts: opts.parts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  })

  await client.send(cmd)
}

export async function abortMultipartUpload(opts: {
  r2Key: string
  uploadId: string
}): Promise<void> {
  const client = getR2Client()
  const bucket = getBucketName()

  const cmd = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: opts.r2Key,
    UploadId: opts.uploadId,
  })

  await client.send(cmd).catch((err) => {
    console.error("[R2] Failed to abort multipart upload:", err.message)
  })
}

export async function listUploadedParts(opts: {
  r2Key: string
  uploadId: string
}): Promise<{ partNumber: number; etag: string; size: number }[]> {
  const client = getR2Client()
  const bucket = getBucketName()

  const parts: { partNumber: number; etag: string; size: number }[] = []
  let partMarker: string | undefined

  while (true) {
    const cmd = new ListPartsCommand({
      Bucket: bucket,
      Key: opts.r2Key,
      UploadId: opts.uploadId,
      PartNumberMarker: partMarker,
    })

    const res = await client.send(cmd)

    if (res.Parts) {
      for (const part of res.Parts) {
        if (part.PartNumber && part.ETag) {
          parts.push({
            partNumber: part.PartNumber,
            etag: part.ETag.replace(/"/g, ""),
            size: part.Size || 0,
          })
        }
      }
    }

    if (!res.IsTruncated) break
    partMarker = String(res.NextPartNumberMarker)
  }

  return parts
}
