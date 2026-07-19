import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedFile } from "@/lib/http/v3/owned"
import { deleteFilesByIds } from "@/lib/models/fileModel"
import { deleteByKey } from "@/lib/storage/r2"

export const DELETE = withApiKey<{ id: string }>(async ({ requestId, userId, params, rate }) => {
  const file = await loadOwnedFile(params.id, userId)
  if (!file) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

  // The row goes first: an orphaned R2 object is swept by hypasched, whereas a
  // row pointing at deleted bytes is a broken link the user can see.
  await deleteFilesByIds([file.id], userId)
  if (file.r2_key) {
    try {
      await deleteByKey(file.r2_key)
    } catch (err) {
      console.warn(`[v3] R2 delete failed for ${file.id}:`, (err as Error).message)
    }
  }

  return v3Ok({ object: "file", id: file.id, deleted: true }, requestId, rate)
}, { scope: "files.delete", label: "files delete" })
