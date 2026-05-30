import { getPool, ensureDatabase, getClient } from './db'
import { randomUUID } from 'node:crypto'
import { encryptFilename, decryptFilename } from './filename-crypto'
import { getFilesByUserId, deleteFileRecord } from './file-model'
import { deleteFileFromR2 } from './r2'
import { getUserTier } from './user-model'
import { getTierDelayMs } from './tier-limits'

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

  return {
    id,
    name: plaintextName,
    parentId,
    createdAt: new Date(),
  }
}

/**
 * Ensures that a given folder path exists for a user.
 * Since folder names are encrypted with a random IV, we must fetch all folders,
 * decrypt them, and traverse the path in memory.
 * 
 * @param userId The owner
 * @param path The relative path string e.g. "Photos/Summer"
 * @param baseFolderId Optional starting folder ID
 * @returns The final folder ID
 */
export async function ensureFolderPath(userId: string, path: string, baseFolderId: string | null = null): Promise<string | null> {
  if (!path || path === '.' || path === '/') return baseFolderId

  // Clean the path
  const parts = path.split('/').filter(p => p.trim().length > 0)
  if (parts.length === 0) return baseFolderId

  const existingFolders = await getFoldersByUserId(userId)
  
  let currentParentId = baseFolderId

  for (const part of parts) {
    // Look for existing folder in current parent
    const existing = existingFolders.find(f => f.parentId === currentParentId && f.name === part)
    
    if (existing) {
      currentParentId = existing.id
    } else {
      // Create new folder
      const newFolder = await createFolder(userId, part, currentParentId)
      existingFolders.push(newFolder) // Add to in-memory list for subsequent parts
      currentParentId = newFolder.id
    }
  }

  return currentParentId
}

/**
 * Recursively deletes a folder and all its contents (subfolders and files).
 */
export async function deleteFolderRecursively(userId: string, folderId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  // We need to find all subfolders and files.
  const allFolders = await getFoldersByUserId(userId)
  const allFiles = await getFilesByUserId(userId) // Note: getFilesByUserId needs to return folder_id now!

  // Build a tree to find all descendants
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

  // Find all files in these folders
  const filesToDelete = allFiles.filter(f => f.folder_id && foldersToDelete.has(f.folder_id))

  const userTier = await getUserTier(userId)
  const delayMs = getTierDelayMs(userTier)

  // Delete files from R2 and DB
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

  // Delete all identified folders
  if (foldersToDelete.size > 0) {
    const ids = Array.from(foldersToDelete)
    // Delete in chunks or single query
    const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',')
    await pool.query(
      `DELETE FROM basedrop_folders WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
      [...ids, userId]
    )
  }
}
