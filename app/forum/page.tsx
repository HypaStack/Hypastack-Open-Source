"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"

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

function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/")
}

function ForumCard({ post }: { post: ForumPost }) {
  const firstImage = post.files.find(f => isImageType(f.content_type))
  const totalSize = post.files.reduce((sum, f) => sum + f.file_size, 0)

  return (
    <Link
      href={`/forum/${post.slug}`}
      className="group block bg-white dark:bg-[#1c1c1c] rounded-xl overflow-hidden border border-[#e8e8e8] dark:border-[#2a2a2a] hover:border-[#d0d0d0] dark:hover:border-[#3a3a3a] transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[16/10] bg-[#f5f5f5] dark:bg-[#141414] overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.public_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MIcon name="folder_open" size={32} className="text-[#ccc] dark:text-[#444]" />
          </div>
        )}
        {/* File count badge */}
        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <MIcon name="attach_file" size={11} />
          {post.files.length}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-[14px] font-semibold text-[#111] dark:text-[#f0f0f0] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#333] dark:group-hover:text-white transition-colors">
          {post.title}
        </h3>

        {post.description && (
          <p className="text-[12px] text-[#888] dark:text-[#777] line-clamp-2 mb-3 leading-relaxed">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-[11px] font-medium text-[#666] dark:text-[#999] bg-[#f0f0f0] dark:bg-[#252525] px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-[11px] text-[#999]">+{post.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-[#999] dark:text-[#666]">
          <span className="flex items-center gap-1">
            <MIcon name="visibility" size={12} />
            {post.views}
          </span>
          <span className="flex items-center gap-1">
            <MIcon name="comment" size={12} />
            {post.comment_count}
          </span>
          <span className="flex items-center gap-1">
            <MIcon name="storage" size={12} />
            {formatFileSize(totalSize)}
          </span>
          <span className="ml-auto">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function TagPill({ tag, active, onClick }: { tag: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-all duration-150 ${
        active
          ? "bg-[#111] dark:bg-[#f0f0f0] text-white dark:text-[#111]"
          : "bg-[#f0f0f0] dark:bg-[#252525] text-[#555] dark:text-[#999] hover:bg-[#e5e5e5] dark:hover:bg-[#333]"
      }`}
    >
      {tag}
    </button>
  )
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null

  const pages: (number | "...")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...")
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[13px] text-[#666] dark:text-[#999] hover:bg-[#f0f0f0] dark:hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MIcon name="chevron_left" size={16} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-[13px] text-[#999]">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              p === page
                ? "bg-[#111] dark:bg-[#f0f0f0] text-white dark:text-[#111]"
                : "text-[#555] dark:text-[#999] hover:bg-[#f0f0f0] dark:hover:bg-[#252525]"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[13px] text-[#666] dark:text-[#999] hover:bg-[#f0f0f0] dark:hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MIcon name="chevron_right" size={16} />
      </button>
    </div>
  )
}

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      if (activeTag) params.set("tag", activeTag)
      if (search) params.set("q", search)

      const res = await fetch(`/api/v2/forum?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error("Failed to fetch forum posts:", err)
    } finally {
      setLoading(false)
    }
  }, [page, activeTag, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
    }
    setPage(1)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Collect all unique tags from current posts for the filter bar
  const allTags = [...new Set(posts.flatMap(p => p.tags))].slice(0, 12)

  return (
    <main className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0f0f0f]">
      <Navbar />

      <section className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-[28px] font-bold text-[#111] dark:text-[#f0f0f0] tracking-tight">
                Forum
              </h1>
              <p className="text-[14px] text-[#888] dark:text-[#777] mt-1">
                Browse and download publicly shared files
              </p>
            </div>
            <Link
              href={isAuthenticated ? "/forum/new" : "/signin?redirect=/forum/new"}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-[#111] dark:bg-[#f0f0f0] text-white dark:text-[#111] text-[13px] font-semibold hover:bg-[#222] dark:hover:bg-[#e0e0e0] active:scale-[0.97] transition-all duration-75"
            >
              <MIcon name="add" size={15} />
              New post
            </Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-5">
            <div className="relative">
              <MIcon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bbb] dark:text-[#555] pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search posts..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1c1c1c] border border-[#e8e8e8] dark:border-[#2a2a2a] text-[13px] text-[#111] dark:text-[#f0f0f0] placeholder:text-[#bbb] dark:placeholder:text-[#555] focus:outline-none focus:border-[#ccc] dark:focus:border-[#444] transition-colors"
              />
            </div>
          </form>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {allTags.map(tag => (
                <TagPill
                  key={tag}
                  tag={tag}
                  active={activeTag === tag}
                  onClick={() => handleTagClick(tag)}
                />
              ))}
              {activeTag && (
                <button
                  onClick={() => { setActiveTag(null); setPage(1) }}
                  className="text-[12px] text-[#999] hover:text-[#666] transition-colors ml-1"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}

          {/* Results info */}
          {!loading && (
            <p className="text-[12px] text-[#999] dark:text-[#666] mb-4">
              {total} post{total !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
              {activeTag ? ` tagged #${activeTag}` : ""}
            </p>
          )}

          {/* Post grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#1c1c1c] rounded-xl border border-[#e8e8e8] dark:border-[#2a2a2a] overflow-hidden animate-pulse">
                  <div className="w-full aspect-[16/10] bg-[#f0f0f0] dark:bg-[#1a1a1a]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#f0f0f0] dark:bg-[#252525] rounded w-3/4" />
                    <div className="h-3 bg-[#f0f0f0] dark:bg-[#252525] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MIcon name="forum" size={48} className="text-[#ddd] dark:text-[#333] mb-4" />
              <h3 className="text-[16px] font-semibold text-[#555] dark:text-[#888] mb-1">
                {search || activeTag ? "No posts found" : "No posts yet"}
              </h3>
              <p className="text-[13px] text-[#999] dark:text-[#666]">
                {search || activeTag ? "Try a different search or tag" : "Be the first to share something!"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map(post => (
                  <ForumCard key={post.id} post={post} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
