import { NextRequest, NextResponse } from "next/server"
import {
  isFileValid,
  markFileBurned,
  deleteFileRecord,
} from "@/lib/file-model"
import { checkDownloadRateLimit } from "@/lib/rate-limit"
import { getPresignedDownloadUrl, deleteByKey } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"

/**
 * Download Route
 * Performs all gating + side effects (rate limit, PIN, burn-on-read,
 * unique-IP tracking, download counter, uploader activity log), then issues
 * a download URL that the client navigates to directly.
 *
 * - Unencrypted files (primary upload path) -> presigned R2 URL.
 *   The browser hits R2 directly; origin RAM is not touched.
 * - Encrypted files (legacy /api/v2/upload-proxy uploads) -> proxy URL.
 *   /api/download-file streams + decrypts without buffering.
 */

const PRESIGNED_TTL_SECONDS = 300
// Burn-on-read uses shorter TTL and faster deletion
const BURN_PRESIGNED_TTL_SECONDS = 60
// Delete from R2 after 90 seconds (allows download to complete)
const BURN_DELETE_DELAY_MS = 90_000

const executeBurnDeletion = async (id: string, r2Key: string) => {
  let attempts = 0;
  const maxAttempts = 5; // 1 initial + 4 retries
  const retryIntervalMs = 7500; // 30s / 4

  while (attempts < maxAttempts) {
    try {
      // 1. Delete DB record
      await deleteFileRecord(id);
      // 2. Delete from R2
      await deleteByKey(r2Key);
      // Success, exit
      return;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        const msg = `[BurnDeletionFailed] completely failed to delete file id: ${id}, key: ${r2Key}, err: ${error instanceof Error ? error.message : String(error)}`;
        if (process.env.NODE_ENV === 'production') {
          try {
            const fs = await import('fs');
            const path = await import('path');
            fs.appendFileSync(path.join(process.cwd(), 'stderr.log'), new Date().toISOString() + " - " + msg + "\n");
          } catch(e) {}
        } else {
          console.error(msg);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
};

export async function handleDownloadPost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const rateLimit = await checkDownloadRateLimit('anonymous')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Download limit reached",
          message: "You've downloaded too many files recently. Please wait a moment.",
          retryAfter: rateLimit.resetInSeconds,
        },
        { status: 429 }
      )
    }

    const { valid, record } = await isFileValid(id)

    if (!record) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (!valid) {
      return NextResponse.json({ error: "File has expired" }, { status: 410 })
    }



    // Atomic burn-mark BEFORE issuing any URL so concurrent requests can't
    // all succeed. markFileBurned uses SELECT ... FOR UPDATE.
    let burned = false
    if (record.burn_on_read === 1) {
      const burnResult = await markFileBurned(id)
      if (!burnResult.success) {
        return NextResponse.json(
          { error: "File has already been downloaded" },
          { status: 410 }
        )
      }
      burned = true
    }


    // Decrypt filenames for display
    const displayName = decryptFilename(record.custom_filename || record.original_name)
    const originalDisplayName = decryptFilename(record.original_name)

    const isEncrypted = !!(record.encryption_iv && record.encryption_auth_tag)

    // Use shorter TTL for burn-on-read files
    const ttl = burned ? BURN_PRESIGNED_TTL_SECONDS : PRESIGNED_TTL_SECONDS

    let downloadUrl: string
    if (isEncrypted) {
      // Legacy encrypted-at-rest fallback (server must decrypt).
      downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/v2/files/${id}/stream`
    } else {
      // Direct R2 — strict header mapping for filename + content type.
      // Decrypt the original_name so the user gets their real filename back.
      downloadUrl = await getPresignedDownloadUrl({
        r2Key: record.r2_key,
        originalName: originalDisplayName,
        contentType: record.content_type || 'application/octet-stream',
        expiresIn: ttl,
      })
    }

    if (burned) {
      // Asynchronously handle the deletion with retries
      executeBurnDeletion(id, record.r2_key);
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: originalDisplayName,
      burned,
    })
  } catch (error) {
    console.error("[Download] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    )
  }
}
