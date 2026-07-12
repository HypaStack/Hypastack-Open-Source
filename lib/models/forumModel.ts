import { getPool, ensureDatabase } from '@/lib/data/db'
import { cached, bustCache, bustCachePattern } from '@/lib/data/cache'
import crypto from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ForumPost {
  id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  tags: string[]
  views: number
  created_at: Date
  updated_at: Date
}

export interface ForumPostWithFiles extends ForumPost {
  files: ForumFile[]
  comment_count: number
  author_nickname_encrypted?: string
  author_avatar_url?: string | null
}

export interface ForumFile {
  id: string
  post_id: string
  user_id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  public_url: string
  created_at: Date
}

export interface ForumComment {
  id: number
  post_id: string
  user_id: string
  parent_id: number | null
  body: string
  created_at: Date
  updated_at: Date
  deleted: boolean
  author_nickname_encrypted?: string
  author_avatar_url?: string | null
  replies?: ForumComment[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function generateForumId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return result
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
    .slice(0, 200)                   // limit length
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(
    tags
      .map(t => t.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))
      .filter(t => t.length > 0)
  )].slice(0, 10)
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function createForumPost(input: {
  userId: string
  title: string
  description?: string
  tags?: string[]
}): Promise<ForumPost> {
  await ensureDatabase()
  const pool = getPool()

  const id = generateForumId()
  let baseSlug = slugify(input.title)
  if (!baseSlug) baseSlug = id

  // Ensure unique slug by appending a short suffix if needed
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const existing = await pool.query('SELECT id FROM forum_posts WHERE slug = $1', [slug])
    if (existing.rows.length === 0) break
    attempt++
    const suffix = crypto.randomInt(100, 9999).toString()
    slug = `${baseSlug}-${suffix}`
    if (attempt > 5) {
      slug = `${baseSlug}-${id}`
      break
    }
  }

  const tags = normalizeTags(input.tags ?? [])

  const result = await pool.query(
    `INSERT INTO forum_posts (id, user_id, slug, title, description, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.userId, slug, input.title.slice(0, 200), input.description ?? null, JSON.stringify(tags)]
  )
  await bustCachePattern('forum:listing:*')
  return mapPostRow(result.rows[0])
}

export async function getForumPosts(opts: {
  page?: number
  limit?: number
  tag?: string
  q?: string
}): Promise<{ posts: ForumPostWithFiles[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30))
  const tag = opts.tag?.toLowerCase() || ''
  const q = opts.q?.trim() || ''
  const cacheKey = `forum:listing:p${page}:l${limit}:t${tag}:q${q}`

  return cached(cacheKey, 30, async () => {
    await ensureDatabase()
    const pool = getPool()

    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (tag) {
      conditions.push(`fp.tags @> $${paramIdx}::jsonb`)
      params.push(JSON.stringify([tag]))
      paramIdx++
    }

    if (q) {
      conditions.push(`to_tsvector('english', coalesce(fp.title,'') || ' ' || coalesce(fp.description,'')) @@ plainto_tsquery('english', $${paramIdx})`)
      params.push(q)
      paramIdx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM forum_posts fp ${where}`,
      params
    )
    const total = Number(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    // Fetch posts with author info
    const postsResult = await pool.query(
      `SELECT fp.*, u.nickname_encrypted as author_nickname_encrypted, u.avatar_url as author_avatar_url
       FROM forum_posts fp
       LEFT JOIN users u ON u.id = fp.user_id
       ${where}
       ORDER BY fp.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    )

    // Fetch files and comment counts for these posts in batch
    const postIds = postsResult.rows.map((r: { id: string }) => r.id)

    let filesMap: Record<string, ForumFile[]> = {}
    let commentCountMap: Record<string, number> = {}

    if (postIds.length > 0) {
      const filesResult = await pool.query(
        `SELECT * FROM forum_files WHERE post_id = ANY($1) ORDER BY created_at ASC`,
        [postIds]
      )
      for (const row of filesResult.rows) {
        const f = mapFileRow(row)
        if (!filesMap[f.post_id]) filesMap[f.post_id] = []
        filesMap[f.post_id].push(f)
      }

      const commentsResult = await pool.query(
        `SELECT post_id, COUNT(*) as cnt FROM forum_comments WHERE post_id = ANY($1) AND deleted = FALSE GROUP BY post_id`,
        [postIds]
      )
      for (const row of commentsResult.rows) {
        commentCountMap[row.post_id] = Number(row.cnt)
      }
    }

    const posts: ForumPostWithFiles[] = postsResult.rows.map((row: PostRow & { author_nickname_encrypted: string; author_avatar_url: string | null }) => ({
      ...mapPostRow(row),
      files: filesMap[row.id] ?? [],
      comment_count: commentCountMap[row.id] ?? 0,
      author_nickname_encrypted: row.author_nickname_encrypted,
      author_avatar_url: row.author_avatar_url,
    }))

    return { posts, total, page, totalPages }
  })
}

export async function getForumPostBySlug(slug: string): Promise<ForumPostWithFiles | null> {
  return cached(`forum:post:${slug}`, 60, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT fp.*, u.nickname_encrypted as author_nickname_encrypted, u.avatar_url as author_avatar_url
       FROM forum_posts fp
       LEFT JOIN users u ON u.id = fp.user_id
       WHERE fp.slug = $1`,
      [slug]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    const filesResult = await pool.query(
      `SELECT * FROM forum_files WHERE post_id = $1 ORDER BY created_at ASC`,
      [row.id]
    )
    const commentCountResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM forum_comments WHERE post_id = $1 AND deleted = FALSE`,
      [row.id]
    )

    return {
      ...mapPostRow(row),
      files: filesResult.rows.map(mapFileRow),
      comment_count: Number(commentCountResult.rows[0].cnt),
      author_nickname_encrypted: row.author_nickname_encrypted,
      author_avatar_url: row.author_avatar_url,
    }
  })
}

export async function getForumPostById(id: string): Promise<ForumPost | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query('SELECT * FROM forum_posts WHERE id = $1', [id])
  if (result.rows.length === 0) return null
  return mapPostRow(result.rows[0])
}

export async function incrementViewCount(id: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id])
}

export async function deleteForumPost(id: string, userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    'DELETE FROM forum_posts WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  if ((result.rowCount ?? 0) === 0) return false

  // Cascade: delete files, comments, reports
  await pool.query('DELETE FROM forum_files WHERE post_id = $1', [id])
  await pool.query('DELETE FROM forum_comments WHERE post_id = $1', [id])
  await pool.query('DELETE FROM forum_reports WHERE post_id = $1', [id])
  await bustCachePattern('forum:listing:*')
  await bustCachePattern(`forum:post:*`)
  await bustCache(`forum:comments:${id}`)

  return true
}

// ── Files ─────────────────────────────────────────────────────────────────

export async function addForumFile(input: {
  id: string
  postId: string
  userId: string
  r2Key: string
  originalName: string
  fileSize: number
  contentType: string
  publicUrl: string
}): Promise<ForumFile> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `INSERT INTO forum_files (id, post_id, user_id, r2_key, original_name, file_size, content_type, public_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [input.id, input.postId, input.userId, input.r2Key, input.originalName, input.fileSize, input.contentType, input.publicUrl]
  )

  await bustCachePattern(`forum:post:*`)
  await bustCachePattern('forum:listing:*')
  await bustCache(`user:${input.userId}:storage`)
  return mapFileRow(result.rows[0])
}

export async function getForumFileCountForPost(postId: string): Promise<number> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    'SELECT COUNT(*) as cnt FROM forum_files WHERE post_id = $1',
    [postId]
  )
  return Number(result.rows[0].cnt)
}

export async function checkDuplicateFileName(postId: string, fileName: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    'SELECT id FROM forum_files WHERE post_id = $1 AND original_name = $2',
    [postId, fileName]
  )
  return result.rows.length > 0
}

export async function getForumFileStatsForUser(userId: string): Promise<{ totalFiles: number; totalSize: number }> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT COUNT(*) as total_files, COALESCE(SUM(file_size), 0) as total_size
     FROM forum_files WHERE user_id = $1`,
    [userId]
  )
  return {
    totalFiles: Number(result.rows[0].total_files),
    totalSize: Number(result.rows[0].total_size),
  }
}

export async function getForumFileR2KeysByPostId(postId: string): Promise<string[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    'SELECT r2_key FROM forum_files WHERE post_id = $1',
    [postId]
  )
  return result.rows.map((r: { r2_key: string }) => r.r2_key)
}

// ── Comments ──────────────────────────────────────────────────────────────

export async function addComment(input: {
  postId: string
  userId: string
  parentId?: number | null
  body: string
}): Promise<ForumComment> {
  await ensureDatabase()
  const pool = getPool()

  // If replying, verify parent exists and is for the same post
  if (input.parentId) {
    const parent = await pool.query(
      'SELECT id, post_id FROM forum_comments WHERE id = $1 AND deleted = FALSE',
      [input.parentId]
    )
    if (parent.rows.length === 0 || parent.rows[0].post_id !== input.postId) {
      throw new Error('Parent comment not found')
    }
  }

  const result = await pool.query(
    `INSERT INTO forum_comments (post_id, user_id, parent_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.postId, input.userId, input.parentId ?? null, input.body.slice(0, 2000)]
  )

  await bustCache(`forum:comments:${input.postId}`)
  await bustCachePattern('forum:post:*')
  return mapCommentRow(result.rows[0])
}

export async function getCommentsByPostId(postId: string): Promise<ForumComment[]> {
  return cached(`forum:comments:${postId}`, 30, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT fc.*, u.nickname_encrypted as author_nickname_encrypted, u.avatar_url as author_avatar_url
       FROM forum_comments fc
       LEFT JOIN users u ON u.id = fc.user_id
       WHERE fc.post_id = $1
       ORDER BY fc.created_at ASC`,
      [postId]
    )

    const all = result.rows.map((row: CommentRow & { author_nickname_encrypted: string; author_avatar_url: string | null }) => ({
      ...mapCommentRow(row),
      author_nickname_encrypted: row.author_nickname_encrypted,
      author_avatar_url: row.author_avatar_url,
    }))

    // Build threaded structure (1 level deep)
    const topLevel = all.filter(c => !c.parent_id)
    const replies = all.filter(c => c.parent_id)

    for (const parent of topLevel) {
      parent.replies = replies.filter(r => r.parent_id === parent.id)
    }

    return topLevel
  })
}

export async function deleteComment(id: number, userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    'UPDATE forum_comments SET deleted = TRUE, body = \'[deleted]\', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted = FALSE',
    [id, userId]
  )
  await bustCachePattern('forum:post:*')
  return (result.rowCount ?? 0) > 0
}

// ── Reports ───────────────────────────────────────────────────────────────

export async function reportPost(postId: string, ip: string | null, reason: string | null): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    'INSERT INTO forum_reports (post_id, reporter_ip, reason) VALUES ($1, $2, $3)',
    [postId, ip, reason?.slice(0, 500) ?? null]
  )
}

// ── Row mappers ───────────────────────────────────────────────────────────

interface PostRow {
  id: string
  user_id: string
  slug: string
  title: string
  description: string
  tags: string[] | null
  views: string | number
  created_at: Date
  updated_at: Date
}

function mapPostRow(row: PostRow): ForumPost {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    views: Number(row.views),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

interface FileRow {
  id: string
  post_id: string
  user_id: string
  r2_key: string
  original_name: string
  file_size: string | number
  content_type: string
  public_url: string
  created_at: Date
}

function mapFileRow(row: FileRow): ForumFile {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    public_url: row.public_url,
    created_at: row.created_at,
  }
}

interface CommentRow {
  id: string | number
  post_id: string
  user_id: string
  parent_id: string | number | null
  body: string
  created_at: Date
  updated_at: Date
  deleted: boolean
}

function mapCommentRow(row: CommentRow): ForumComment {
  return {
    id: Number(row.id),
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id ? Number(row.parent_id) : null,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted: row.deleted,
  }
}
