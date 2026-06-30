import { getPool, ensureDatabase, getClient } from '@/lib/data/db'
import { randomUUID } from 'node:crypto'
import { encryptFilename, decryptFilename } from '@/lib/security/filenameCrypto'
import { getFilesByUserId, deleteFileRecord } from '@/lib/models/fileModel'
import { deleteFileFromR2 } from '@/lib/storage/r2'
import { getUserTier } from '@/lib/models/userModel'
import { getTierDelayMs } from '@/constants/tier-limits'
import { cached, bustCache } from '@/lib/data/cache'

export interface FolderRecord {
  id: string
  user_id: string
  name_encrypted: string
  parent_id: string | null
  created_at: Date
  updated_at: Date
}

export interface DecryptedFolder {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
}

export async function getFoldersByUserId(userId: string): Promise<DecryptedFolder[]> {
  return cached(`user:${userId}:folders`, 300, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT * FROM basedrop_folders WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    )

    return result.rows.map(row => ({
      id: row.id,
      name: decryptFilename(row.name_encrypted),
      parentId: row.parent_id,
      createdAt: row.created_at,
    }))
  })
}

export async function createFolder(userId: string, plaintextName: string, parentId: string | null): Promise<DecryptedFolder> {
  await ensureDatabase()
  const pool = getPool()

  const id = randomUUID()
  const nameEncrypted = encryptFilename(plaintextName)

  await pool.query(
    `INSERT INTO basedrop_folders (id, user_id, name_encrypted, parent_id)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, nameEncrypted, parentId]
  )

  await bustCache(`user:${userId}:folders`)

  return {
    id,
    name: plaintextName,
    parentId,
    createdAt: new Date(),
  }
}

export async function ensureFolderPath(userId: string, path: string, baseFolderId: string | null = null): Promise<string | null> {
  if (!path || path === '.' || path === '/') return baseFolderId

  const parts = path.split('/').filter(p => p.trim().length > 0)
  if (parts.length === 0) return baseFolderId

  const existingFolders = await getFoldersByUserId(userId)
  
  let currentParentId = baseFolderId

  for (const part of parts) {
    const existing = existingFolders.find(f => f.parentId === currentParentId && f.name === part)
    
    if (existing) {
      currentParentId = existing.id
    } else {
      const newFolder = await createFolder(userId, part, currentParentId)
      existingFolders.push(newFolder)
      currentParentId = newFolder.id
    }
  }

  return currentParentId
}

/**
 * Validates an explicit folderId belongs to the user (if given) and, when a
 * file `path` like "Folder/Sub/file.ext" is provided, ensures the directory
 * portion exists, creating folders as needed. Returns the resolved folder id.
 *
 * Shared by the upload init handlers (single + multipart) which had this block
 * copy-pasted. Kept free of HTTP concerns — callers map `{ ok: false }` to 403.
 */
export async function resolveUploadFolder(
  userId: string,
  folderId: string | null | undefined,
  path: string | null | undefined,
): Promise<{ ok: true; folderId: string | null } | { ok: false }> {
  let finalFolderId = folderId || null

  if (finalFolderId) {
    const userFolders = await getFoldersByUserId(userId)
    if (!userFolders.some(f => f.id === finalFolderId)) {
      return { ok: false }
    }
  }

  if (path) {
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null
    if (dirPath) {
      finalFolderId = await ensureFolderPath(userId, dirPath, folderId || null)
    }
  }

  return { ok: true, folderId: finalFolderId }
}

export async function deleteFolderRecursively(userId: string, folderId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  const allFolders = await getFoldersByUserId(userId)
  const allFiles = await getFilesByUserId(userId)

  const foldersToDelete = new Set<string>([folderId])
  let added = true
  while (added) {
    added = false
    for (const f of allFolders) {
      if (f.parentId && foldersToDelete.has(f.parentId) && !foldersToDelete.has(f.id)) {
        foldersToDelete.add(f.id)
        added = true
      }
    }
  }

  const filesToDelete = allFiles.filter(f => f.folder_id && foldersToDelete.has(f.folder_id))

  const userTier = await getUserTier(userId)
  const delayMs = getTierDelayMs(userTier)

  let i = 0
  for (const file of filesToDelete) {
    if (i > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    i++
    try {
      const fileName = file.r2_key.split('/').pop() || ''
      await deleteFileFromR2(file.id, fileName)
      await deleteFileRecord(file.id)
    } catch (err) {
      console.error("[FolderModel] Failed to delete file during recursive folder deletion:", file.id, err)
    }
  }

  if (foldersToDelete.size > 0) {
    const ids = Array.from(foldersToDelete)
    const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',')
    await pool.query(
      `DELETE FROM basedrop_folders WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
      [...ids, userId]
    )
  }

  await bustCache(`user:${userId}:folders`, `user:${userId}:files`, `user:${userId}:file-stats`, `user:${userId}:storage`)
}
