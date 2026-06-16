"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/fetch"
import { hypaConfirm } from "@/components/ui/hypa-notif"

interface ForumFile {
  id: string
  original_name: string
  file_size: number
  content_type: string
  public_url: string
}

interface ForumPost {
  id: string
  slug: string
  user_id: string
  title: string
  description: string | null
  tags: string[]
  views: number
  created_at: string
  files: ForumFile[]
  comment_count: number
  author_nickname_encrypted?: string
  author_avatar_url?: string | null
}

interface ForumComment {
  id: number
  user_id: string
  parent_id: number | null
  body: string
  created_at: string
  deleted: boolean
  author_nickname_encrypted?: string
  author_avatar_url?: string | null
  replies?: ForumComment[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function isImageType(ct: string) { return ct.startsWith("image/") }
function isVideoType(ct: string) { return ct.startsWith("video/") }
function isAudioType(ct: string) { return ct.startsWith("audio/") }

function FilePreview({ file }: { file: ForumFile }) {
  if (isImageType(file.content_type)) {
    return (
      <a href={file.public_url} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="relative rounded-lg overflow-hidden bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#2a2a2a]">
          <img
            src={file.public_url}
            alt={file.original_name}
            className="w-full max-h-[500px] object-contain group-hover:scale-[1.01] transition-transform duration-200"
            loading="lazy"
          />
        </div>
        <p className="text-[12px] text-[#888] mt-1.5 flex items-center gap-1.5">
          <MIcon name="image" size={12} />
          {file.original_name} · {formatFileSize(file.file_size)}
        </p>
      </a>
    )
  }

  if (isVideoType(file.content_type)) {
    return (
      <div>
        <video
          src={file.public_url}
          controls
          className="w-full max-h-[500px] rounded-lg bg-black"
          preload="metadata"
        />
        <p className="text-[12px] text-[#888] mt-1.5 flex items-center gap-1.5">
          <MIcon name="movie" size={12} />
          {file.original_name} · {formatFileSize(file.file_size)}
        </p>
      </div>
    )
  }

  if (isAudioType(file.content_type)) {
    return (
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] p-4">
        <audio src={file.public_url} controls className="w-full" preload="metadata" />
        <p className="text-[12px] text-[#888] mt-2 flex items-center gap-1.5">
          <MIcon name="music_note" size={12} />
          {file.original_name} · {formatFileSize(file.file_size)}
        </p>
      </div>
    )
  }

  // Generic file download
  return (
    <a
      href={file.public_url}
      download={file.original_name}
      className="flex items-center gap-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] p-3.5 hover:bg-[#ebebeb] dark:hover:bg-[#222] transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-[#e5e5e5] dark:bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
        <MIcon name="description" size={18} className="text-[#888] dark:text-[#777]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#333] dark:text-[#ccc] truncate">{file.original_name}</p>
        <p className="text-[11px] text-[#999]">{formatFileSize(file.file_size)}</p>
      </div>
      <MIcon name="download" size={16} className="text-[#999] group-hover:text-[#555] transition-colors flex-shrink-0" />
    </a>
  )
}

function CommentComponent({
  comment,
  postId,
  userId,
  onRefresh,
  depth = 0,
}: {
  comment: ForumComment
  postId: string
  userId: string | null
  onRefresh: () => void
  depth?: number
}) {
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyBody.trim() || submitting) return
    setSubmitting(true)
    try {
      const csrfRes = await apiFetch("/api/v2/csrf")
      const { token: csrfToken } = await csrfRes.json()
      const res = await apiFetch(`/api/v2/forum/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken, body: replyBody.trim(), parentId: comment.id }),
      })
      if (res.ok) {
        setReplyBody("")
        setReplying(false)
        onRefresh()
      }
    } catch (err) {
      console.error("Failed to reply:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await hypaConfirm({
      title: "Delete this comment?",
      description: "This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
    })
    if (!confirmed) return
    try {
      await apiFetch(`/api/v2/forum/${postId}/comments/${comment.id}`, { method: "DELETE" })
      onRefresh()
    } catch (err) {
      console.error("Failed to delete comment:", err)
    }
  }

  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-[#e8e8e8] dark:border-[#2a2a2a] pl-4" : ""}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          {comment.author_avatar_url ? (
            <img src={comment.author_avatar_url} alt="" className="w-5 h-5 rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#e5e5e5] dark:bg-[#333] flex items-center justify-center">
              <MIcon name="person" size={10} className="text-[#999]" />
            </div>
          )}
          <span className="text-[12px] font-medium text-[#555] dark:text-[#999]">
            {comment.author_nickname_encrypted ? "User" : "Anonymous"}
          </span>
          <span className="text-[11px] text-[#bbb] dark:text-[#555]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className={`text-[13px] leading-relaxed ${comment.deleted ? "text-[#bbb] dark:text-[#555] italic" : "text-[#333] dark:text-[#ccc]"}`}>
          {comment.body}
        </p>
        {!comment.deleted && (
          <div className="flex items-center gap-3 mt-1.5">
            {userId && depth === 0 && (
              <button
                onClick={() => setReplying(!replying)}
                className="text-[11px] text-[#999] hover:text-[#555] dark:hover:text-[#ccc] transition-colors"
              >
                Reply
              </button>
            )}
            {userId === comment.user_id && (
              <button
                onClick={handleDelete}
                className="text-[11px] text-[#999] hover:text-[#ef4444] transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Reply form */}
        {replying && (
          <form onSubmit={handleReply} className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 h-8 px-3 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#2a2a2a] text-[12px] text-[#111] dark:text-[#f0f0f0] placeholder:text-[#bbb] dark:placeholder:text-[#555] focus:outline-none"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!replyBody.trim() || submitting}
              className="h-8 px-3 rounded-lg bg-[#111] dark:bg-[#f0f0f0] text-white dark:text-[#111] text-[12px] font-medium disabled:opacity-40 hover:bg-[#222] dark:hover:bg-[#e0e0e0] transition-colors"
            >
              Reply
            </button>
          </form>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              postId={postId}
              userId={userId}
              onRefresh={onRefresh}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ForumPostPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { userId, isAuthenticated } = useAuth()

  const [post, setPost] = useState<ForumPost | null>(null)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentBody, setCommentBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/forum/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setPost(data.post)
      } else {
        setPost(null)
      }
    } catch {
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  const fetchComments = useCallback(async () => {
    if (!post) return
    try {
      const res = await fetch(`/api/v2/forum/${post.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err)
    }
  }, [post])

  useEffect(() => { fetchPost() }, [fetchPost])
  useEffect(() => { if (post) fetchComments() }, [post, fetchComments])

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim() || submitting || !post) return
    setSubmitting(true)
    try {
      const csrfRes = await apiFetch("/api/v2/csrf")
      const { token: csrfToken } = await csrfRes.json()
      const res = await apiFetch(`/api/v2/forum/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken, body: commentBody.trim() }),
      })
      if (res.ok) {
        setCommentBody("")
        fetchComments()
      }
    } catch (err) {
      console.error("Failed to post comment:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!post || deleting) return
    const confirmed = await hypaConfirm({
      title: "Delete this post?",
      description: "This will permanently remove the post and all its files. This cannot be undone.",
      confirmText: "Delete post",
      destructive: true,
    })
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/v2/forum/${post.id}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/forum")
      }
    } catch (err) {
      console.error("Failed to delete post:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleReport = async () => {
    if (!post) return
    window.open(`https://t.me/t_usekiko?text=${encodeURIComponent(`Reporting forum post: ${window.location.href}`)}`, "_blank")
    try {
      await fetch(`/api/v2/forum/${post.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Reported via UI" }),
      })
    } catch {}
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0f0f0f]">
        <Navbar />
        <section className="flex-1 pt-24 pb-20">
          <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-[#f0f0f0] dark:bg-[#1a1a1a] rounded w-3/4" />
              <div className="h-4 bg-[#f0f0f0] dark:bg-[#1a1a1a] rounded w-1/2" />
              <div className="h-64 bg-[#f0f0f0] dark:bg-[#1a1a1a] rounded-xl" />
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0f0f0f]">
        <Navbar />
        <section className="flex-1 pt-24 pb-20 flex flex-col items-center justify-center">
          <MIcon name="error" size={48} className="text-[#ddd] dark:text-[#333] mb-4" />
          <h2 className="text-[18px] font-semibold text-[#555] dark:text-[#888] mb-2">Post not found</h2>
          <Link href="/forum" className="text-[13px] text-[#999] hover:text-[#555] transition-colors">
            Back to forum
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0f0f0f]">
      <Navbar />

      <section className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#999] hover:text-[#555] dark:hover:text-[#ccc] transition-colors mb-6"
          >
            <MIcon name="arrow_back" size={14} />
            Back to forum
          </Link>

          {/* Title */}
          <h1 className="text-[24px] font-bold text-[#111] dark:text-[#f0f0f0] tracking-tight mb-2">
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-[12px] text-[#999] dark:text-[#666] mb-2">
            <span className="flex items-center gap-1">
              <MIcon name="visibility" size={13} />
              {post.views} views
            </span>
            <span className="flex items-center gap-1">
              <MIcon name="schedule" size={13} />
              {timeAgo(post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <MIcon name="attach_file" size={13} />
              {post.files.length} file{post.files.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/forum?tag=${encodeURIComponent(tag)}`}
                  className="text-[11px] font-medium text-[#666] dark:text-[#999] bg-[#f0f0f0] dark:bg-[#252525] px-2.5 py-1 rounded-full hover:bg-[#e5e5e5] dark:hover:bg-[#333] transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Description */}
          {post.description && (
            <div className="bg-white dark:bg-[#1c1c1c] rounded-xl border border-[#e8e8e8] dark:border-[#2a2a2a] p-5 mb-6">
              <p className="text-[14px] text-[#333] dark:text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            </div>
          )}

          {/* Files */}
          <div className="space-y-4 mb-8">
            {post.files.map(file => (
              <FilePreview key={file.id} file={file} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-10 pb-8 border-b border-[#e8e8e8] dark:border-[#2a2a2a]">
            <button
              onClick={handleReport}
              className="flex items-center gap-1.5 text-[12px] text-[#999] hover:text-[#ef4444] transition-colors"
            >
              <MIcon name="flag" size={13} />
              Report
            </button>
            {userId === post.user_id && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-[12px] text-[#ef4444] hover:text-[#dc2626] transition-colors disabled:opacity-50"
              >
                <MIcon name="delete" size={13} />
                {deleting ? "Deleting..." : "Delete post"}
              </button>
            )}
          </div>

          {/* Comments section */}
          <div>
            <h2 className="text-[16px] font-semibold text-[#111] dark:text-[#f0f0f0] mb-4">
              Comments ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)})
            </h2>

            {/* Comment form */}
            {isAuthenticated ? (
              <form onSubmit={handleComment} className="mb-6">
                <textarea
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#1c1c1c] border border-[#e8e8e8] dark:border-[#2a2a2a] text-[13px] text-[#111] dark:text-[#f0f0f0] placeholder:text-[#bbb] dark:placeholder:text-[#555] focus:outline-none focus:border-[#ccc] dark:focus:border-[#444] transition-colors resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || submitting}
                    className="h-8 px-4 rounded-lg bg-[#111] dark:bg-[#f0f0f0] text-white dark:text-[#111] text-[12px] font-semibold disabled:opacity-40 hover:bg-[#222] dark:hover:bg-[#e0e0e0] active:scale-[0.97] transition-all duration-75"
                  >
                    {submitting ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-xl p-4 mb-6 text-center">
                <p className="text-[13px] text-[#888] dark:text-[#777]">
                  <Link href="/signin?redirect=/forum" className="text-[#111] dark:text-[#f0f0f0] font-medium hover:underline">
                    Sign in
                  </Link>
                  {" "}to leave a comment
                </p>
              </div>
            )}

            {/* Comment list */}
            {comments.length === 0 ? (
              <p className="text-[13px] text-[#999] dark:text-[#666] text-center py-8">
                No comments yet. Be the first!
              </p>
            ) : (
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#1a1a1a]">
                {comments.map(comment => (
                  <CommentComponent
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    userId={userId}
                    onRefresh={fetchComments}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
