"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
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

function ForumCard({ post }: { post: ForumPost }) {
  const totalSize = post.files.reduce((sum, f) => sum + f.file_size, 0)

  return (
    <Link
      href={`/forum/${post.slug}`}
      className="group block bg-[#08090a]  border-b border-[rgba(255,255,255,0.08)]  hover:bg-[rgba(255,255,255,0.02)]  transition-colors p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:border-t"
    >
      {/* Left side: Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[16px] font-semibold text-[#f7f8f8]  leading-snug truncate mb-1 group-hover:text-[#e3e3e3]  transition-colors">
          {post.title}
        </h3>

        {post.description && (
          <p className="text-[13px] text-[#898e97]  line-clamp-1 mb-2">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.slice(0, 6).map(tag => (
              <span
                key={tag}
                className="text-[11px] font-medium text-[#a1a1aa]  bg-[rgba(255,255,255,0.04)]  px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {post.tags.length > 6 && (
              <span className="text-[11px] text-[#999]">+{post.tags.length - 6}</span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Meta */}
      <div className="flex items-center gap-4 text-[12px] text-[#898e97]  md:min-w-[300px] md:justify-end shrink-0">
        <span className="flex items-center gap-1 w-12 justify-end" title="Views">
          <MIcon name="visibility" size={14} />
          {post.views}
        </span>
        <span className="flex items-center gap-1 w-12 justify-end" title="Comments">
          <MIcon name="comment" size={14} />
          {post.comment_count}
        </span>
        <span className="flex items-center gap-1 w-12 justify-end" title="Files">
          <MIcon name="attach_file" size={14} />
          {post.files.length}
        </span>
        <span className="flex items-center gap-1 w-20 justify-end" title="Total Size">
          <MIcon name="storage" size={14} />
          {formatFileSize(totalSize)}
        </span>
        <span className="w-20 text-right">{timeAgo(post.created_at)}</span>
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
          ? "bg-[#f7f8f8]  text-[#08090a] "
          : "bg-[rgba(255,255,255,0.04)]  text-[#444]  hover:bg-[rgba(255,255,255,0.08)] "
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
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[13px] text-[#a1a1aa]  hover:bg-[rgba(255,255,255,0.04)]  disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                ? "bg-[#f7f8f8]  text-[#08090a] "
                : "text-[#444]  hover:bg-[rgba(255,255,255,0.04)] "
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[13px] text-[#a1a1aa]  hover:bg-[rgba(255,255,255,0.04)]  disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
    <main className="flex min-h-screen flex-col bg-[#08090a] ">
      <Navbar />

      <section className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-[28px] font-bold text-[#f7f8f8]  tracking-tight">
                Forum
              </h1>
              <p className="text-[14px] text-[#898e97]  mt-1">
                Browse and download publicly shared files
              </p>
            </div>
            <Link
              href={isAuthenticated ? "/forum/new" : "/signin?redirect=/forum/new"}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-[#f7f8f8]  text-[#08090a]  text-[13px] font-semibold hover:bg-[#e3e3e3]  active:scale-[0.97] transition-all duration-75"
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
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]  pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search posts..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#08090a]  border border-[rgba(255,255,255,0.08)]  text-[13px] text-[#f7f8f8]  placeholder:text-[#555]  focus:outline-none focus:border-[#898e97]  transition-colors"
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
                  className="text-[12px] text-[#898e97] hover:text-[#a1a1aa] transition-colors ml-1"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}

          {/* Results info */}
          {!loading && (
            <p className="text-[12px] text-[#898e97]  mb-4">
              {total} post{total !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
              {activeTag ? ` tagged #${activeTag}` : ""}
            </p>
          )}

          {/* Post list */}
          {loading ? (
            <div className="flex justify-center items-center py-20 border-t border-[rgba(255,255,255,0.08)] ">
              <svg className="animate-spin h-8 w-8 text-[#444]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MIcon name="forum" size={48} className="text-[#333]  mb-4" />
              <h3 className="text-[16px] font-semibold text-[#444]  mb-1">
                {search || activeTag ? "No posts found" : "No posts yet"}
              </h3>
              <p className="text-[13px] text-[#898e97] ">
                {search || activeTag ? "Try a different search or tag" : "Be the first to share something!"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                {posts.map(post => (
                  <ForumCard key={post.id} post={post} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </section>
    </main>
  )
}
