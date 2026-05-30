"use client"


import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { MIcon } from "@/components/ui/material-icon"

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatExactTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Activity {
  id: string
  action_type: string
  file_name: string | null
  details: string | null
  actor_type: string
  created_at: string
}

function getActivityIcon(actionType: string) {
  switch (actionType) {
    case "upload": return <MIcon name="cloud_upload" size={16} />
    case "download": return <MIcon name="download" size={16} />
    case "nickname_change": return <MIcon name="edit" size={16} />
    case "delete_file": return <MIcon name="delete" size={16} />
    case "burn_download": return <MIcon name="local_fire_department" size={16} />
    case "password_change": return <MIcon name="lock" size={16} />
    default: return <MIcon name="article" size={16} />
  }
}

function getActivityIconBg(_actionType: string): string {
  return "text-foreground"
}

function getActivityMessage(activity: Activity): string {
  if (activity.details) return activity.details

  switch (activity.action_type) {
    case "upload":
      return activity.file_name
        ? `You uploaded ${activity.file_name}`
        : "You uploaded a new file"
    case "download":
      return activity.file_name
        ? `Someone downloaded ${activity.file_name}`
        : "Someone downloaded your file"
    case "nickname_change":
      return "Nickname was changed"
    case "delete_file":
      return activity.file_name
        ? `You deleted ${activity.file_name}`
        : "You deleted a file"
    case "burn_download":
      return activity.file_name
        ? `${activity.file_name} was burned after download`
        : "A file was burned after download"
    case "password_change":
      return "Password was changed"
    default:
      return "Activity recorded"
  }
}

export default function RecentActivityPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      fetch(`/api/v2/auth/activity?limit=${limit}&offset=${offset}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.activities) {
            setActivities(data.activities)
            setTotal(data.total || 0)
          }
        })
        .catch((err) => console.error("Activities error:", err))
        .finally(() => setLoading(false))
    }
  }, [isAuthenticated, offset])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <MIcon name="refresh" size={24} className="text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const hasNext = offset + limit < total
  const hasPrev = offset > 0

  return (
    <div className="w-full px-6 lg:px-8 pb-8 pt-10">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground font-normal">
          {total} total events
        </p>
      </div>

      {/* Activity list */}
      <div className="rounded-lg bg-card border border-border/40 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <MIcon name="refresh" size={24} className="text-muted-foreground animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MIcon name="article" size={40} className="mx-auto mb-3" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">
              Upload your first file to see activity here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-secondary transition-colors"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center ${getActivityIconBg( activity.action_type )}`}
                >
                  {getActivityIcon(activity.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    {getActivityMessage(activity)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MIcon name="schedule" size={12} />
                      {formatExactTime(activity.created_at)}
                    </span>

                    {activity.actor_type === "other" && (
                      <span className="inline-flex items-center rounded-md bg-[#b0b0b0]/10 border border-[#b0b0b0]/30 px-2 py-0.5 text-[10px] font-medium text-[#b0b0b0]">
                        External
                      </span>
                    )}
                    {activity.actor_type === "self" && (
                      <span className="inline-flex items-center rounded-md bg-zinc-500/10 border border-zinc-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && total > limit && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              disabled={!hasPrev}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground  disabled:cursor-not-allowed transition-colors"
            >
              <MIcon name="chevron_left" size={16} />
              Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {offset + 1}�{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              type="button"
              onClick={() => setOffset((prev) => prev + limit)}
              disabled={!hasNext}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground  disabled:cursor-not-allowed transition-colors"
            >
              Next
              <MIcon name="chevron_right" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
