import type { InviteCodeRow } from "@/lib/models/inviteModel"
import type { AdminUserRow } from "@/lib/models/userModel"
import type { BlacklistedIp } from "@/lib/models/blacklistModel"

// shared by the per-section GETs and the batched overview so both hand the
// client the exact same shape

export const serializeInviteCode = (c: InviteCodeRow) => ({
  code: c.code,
  maxUses: c.max_uses,
  usesCount: c.uses_count,
  redeemedBy: c.redeemed_by,
  createdAt: c.created_at,
})

export const serializeAdminUser = (u: AdminUserRow) => ({
  id: u.id,
  displayName: u.display_name,
  avatarUrl: u.avatar_url,
  tier: u.tier,
  suspended: u.suspended,
  isOwner: u.is_owner,
  storageUsed: u.storage_used,
  createdAt: u.created_at,
  lastLogin: u.last_login,
})

export const serializeBlacklistEntry = (e: BlacklistedIp) => ({
  ipHash: e.ip_hash,
  reason: e.reason,
  createdAt: e.created_at,
})
