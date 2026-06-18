import { getPool, ensureDatabase } from './db'
import { randomUUID } from 'node:crypto'
import { deleteObjectsBatch } from './r2'
import { deleteCdnAssetsByIds } from './cdn-model'
import { cached, bustCache } from './cache'

export interface CdnFolder {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  created_at: Date
  updated_at: Date
}

export interface CdnFolderResponse {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
}

export async function getCdnFoldersByUserId(userId: string): Promise<CdnFolderResponse[]> {
  return cached(`user:${userId}:cdn-folders`, 300, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT * FROM cdn_folders WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    )

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      createdAt: row.created_at,
    }))
  })
}

export async function createCdnFolder(userId: string, name: string, parentId: string | null): Promise<CdnFolderResponse> {
  await ensureDatabase()
  const pool = getPool()

  const id = randomUUID()

  await pool.query(
    `INSERT INTO cdn_folders (id, user_id, name, parent_id)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, name, parentId]
  )

  await bustCache(`user:${userId}:cdn-folders`)

  return {
    id,
    name,
    parentId,
    createdAt: new Date(),
  }
}

export interface DeletedAssetInfo {
  id: string
  name: string
  r2_key: string
}

export async function deleteCdnFolderRecursively(
  userId: string,
  folderId: string
): Promise<{ deletedAssets: DeletedAssetInfo[]; folderIds: string[] }> {
  await ensureDatabase()
  const pool = getPool()

  const allFolders = await getCdnFoldersByUserId(userId)

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

  const folderIds = Array.from(foldersToDelete)

  const placeholders = folderIds.map((_, i) => '$' + (i + 1)).join(',')
  const assetsResult = await pool.query(
    `SELECT id, r2_key, original_name FROM cdn_assets
     WHERE folder_id IN (${placeholders}) AND user_id = $${folderIds.length + 1}`,
    [...folderIds, userId]
  )

  const assets: DeletedAssetInfo[] = assetsResult.rows.map(row => ({
    id: row.id,
    name: row.original_name,
    r2_key: row.r2_key,
  }))

  const r2Keys = assets.map(a => a.r2_key)
  let failedR2Keys = new Set<string>()
  if (r2Keys.length > 0) {
    try {
      const failed = await deleteObjectsBatch(r2Keys)
      failedR2Keys = new Set(failed)
    } catch (err) {
      console.error('[CdnFolderModel] R2 batch delete error:', err)
    }
  }

  const successfulIds = assets.filter(a => !failedR2Keys.has(a.r2_key)).map(a => a.id)
  if (successfulIds.length > 0) {
    await deleteCdnAssetsByIds(successfulIds, userId)
  }

  if (folderIds.length > 0) {
    const ph = folderIds.map((_, i) => '$' + (i + 1)).join(',')
    await pool.query(
      `DELETE FROM cdn_folders WHERE id IN (${ph}) AND user_id = $${folderIds.length + 1}`,
      [...folderIds, userId]
    )
  }

  await bustCache(`user:${userId}:cdn-folders`, `user:${userId}:cdn-assets`, `user:${userId}:cdn-stats`, `user:${userId}:storage`)

  const deletedAssets = assets.filter(a => !failedR2Keys.has(a.r2_key))
  return { deletedAssets, folderIds }
}
