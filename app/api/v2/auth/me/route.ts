import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { getUserFileStats, getFilesByUserId } from "@/lib/file-model"
import { getUserCdnStats, getTotalStorageUsed, getCdnAssetsByUserId } from "@/lib/cdn-model"
import { getFoldersByUserId } from "@/lib/folder-model"
import { getCdnFoldersByUserId } from "@/lib/cdn-folder-model"
import { decryptFilename } from "@/lib/filename-crypto"
import { normalizeTier, isPaidTier, getTierLimits } from "@/lib/tier-limits"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    // Single parallel fan-out — one session check, all data in one round-trip
    const [user, fileStats, cdnStats, totalStorage, rawFiles, rawCdnAssets, rawFolders, rawCdnFolders] = await Promise.all([
      getUserById(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
      getFilesByUserId(currentUser.userId),
      getCdnAssetsByUserId(currentUser.userId),
      getFoldersByUserId(currentUser.userId),
      getCdnFoldersByUserId(currentUser.userId),
    ])

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const tier = normalizeTier(user.tier)
    const lastAcknowledgedTier = normalizeTier(user.last_acknowledged_tier)
    const tierLimits = getTierLimits(tier)

    // Transform files into the same shape the /api/v2/files endpoint used
    const files = rawFiles.map(f => ({
      id: f.id,
      name: decryptFilename(f.custom_filename || f.original_name),
      size: f.file_size,
      contentType: f.content_type,
      uploadedAt: f.upload_date,
      expiresAt: f.expires_at,
      hasPin: !!f.pin,
      burnOnRead: f.burn_on_read,
      starred: !!f.starred,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
      folderId: f.folder_id || null,
    }))

    // Transform CDN assets into the same shape the /api/v2/cdn/assets endpoint used
    const cdnAssets = rawCdnAssets.map(a => ({
      id: a.id,
      name: a.original_name,
      size: a.file_size,
      contentType: a.content_type,
      cdnUrl: a.cdn_url,
      folderId: a.folder_id || null,
      createdAt: a.created_at,
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        nickname_encrypted: user.nickname_encrypted, // to be decrypted client-side
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        premium: isPaidTier(tier),
        tier,
        lastAcknowledgedTier,
        inactivityPurgeDays: user.inactivity_purge_days ?? 7,
        is_insider: user.is_insider ?? 0,
      },
      stats: {
        ...fileStats,
        cdnAssets: cdnStats.totalAssets,
        cdnStorage: cdnStats.totalSize,
        totalStorage,
        maxStorage: tierLimits.maxCdnStorage,
        storagePercent: Math.min(100, Math.round((totalStorage / tierLimits.maxCdnStorage) * 100)),
        tierLabel: tierLimits.label,
      },
      files,
      folders: rawFolders,
      cdnAssets,
      cdnFolders: rawCdnFolders,
    })

  } catch (error) {
    console.error("[Auth] Get user error:", error)
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    )
  }
}
