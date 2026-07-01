import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withRouteCache } from "@/lib/http/routeCache"
import { getCurrentUser } from "@/lib/security/auth"
import { getUserById } from "@/lib/models/userModel"
import { getFilesByUserId } from "@/lib/models/fileModel"
import { getCdnAssetsByUserId } from "@/lib/models/cdnModel"
import { getFoldersByUserId } from "@/lib/models/folderModel"
import { getCdnFoldersByUserId } from "@/lib/models/cdnFolderModel"
import { decryptFilename } from "@/lib/security/filenameCrypto"
import { normalizeTier, isPaidTier, getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Parse ?include=user,stats,files,cdn,folders to control what data is returned
    const includeParam = request.nextUrl.searchParams.get("include") || ""
    const includes = new Set(includeParam.split(",").map(s => s.trim()).filter(Boolean))

    // No includes → lightweight auth-only response
    if (includes.size === 0) {
      return NextResponse.json({ authenticated: true, userId: currentUser.userId })
    }

    const wantUser = includes.has("user")
    const wantStats = includes.has("stats")
    const wantFiles = includes.has("files")
    const wantCdn = includes.has("cdn")
    const wantFolders = includes.has("folders")

    // Fetch only what's needed
    const [user, rawFiles, rawCdnAssets, rawFolders, rawCdnFolders] = await Promise.all([
      (wantUser || wantStats) ? getUserById(currentUser.userId) : Promise.resolve(null),
      (wantFiles || wantStats) ? getFilesByUserId(currentUser.userId) : Promise.resolve([]),
      (wantCdn || wantStats) ? getCdnAssetsByUserId(currentUser.userId) : Promise.resolve([]),
      wantFolders ? getFoldersByUserId(currentUser.userId) : Promise.resolve([]),
      wantCdn ? getCdnFoldersByUserId(currentUser.userId) : Promise.resolve([]),
    ])

    if ((wantUser || wantStats) && !user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "User not found")
    }

    const body: Record<string, unknown> = { authenticated: true, userId: currentUser.userId }

    if (wantUser && user) {
      const tier = normalizeTier(user.tier)
      const lastAcknowledgedTier = normalizeTier(user.last_acknowledged_tier)
      body.user = {
        id: user.id,
        nickname_encrypted: user.nickname_encrypted,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        premium: isPaidTier(tier),
        tier,
        lastAcknowledgedTier,
        inactivityPurgeDays: user.inactivity_purge_days ?? 7,
      }
    }

    if (wantStats && user) {
      const tier = normalizeTier(user.tier)
      const tierLimits = getTierLimits(tier)
      const now = Date.now()
      const fileStorageUsed = rawFiles.reduce((sum, f) => sum + f.file_size, 0)
      const cdnStorageUsed = rawCdnAssets.reduce((sum, a) => sum + a.file_size, 0)
      const totalStorage = fileStorageUsed + cdnStorageUsed

      body.stats = {
        totalUploads: rawFiles.length,
        activeFiles: rawFiles.filter(f => new Date(f.expires_at).getTime() > now).length,
        storageUsed: fileStorageUsed,
        cdnAssets: rawCdnAssets.length,
        cdnStorage: cdnStorageUsed,
        totalStorage,
        maxStorage: tierLimits.maxCdnStorage,
        storagePercent: Math.min(100, (totalStorage / tierLimits.maxCdnStorage) * 100),
        tierLabel: tierLimits.label,
      }
    }

    if (wantFiles) {
      body.files = rawFiles.map(f => ({
        id: f.id,
        name: decryptFilename(f.custom_filename || f.original_name),
        size: f.file_size,
        contentType: f.content_type,
        uploadedAt: f.upload_date,
        expiresAt: f.expires_at,

        burnOnRead: f.burn_on_read,
        starred: !!f.starred,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
        folderId: f.folder_id || null,
      }))
      body.folders = rawFolders
    }

    if (wantCdn) {
      body.cdnAssets = rawCdnAssets.map(a => ({
        id: a.id,
        name: a.original_name,
        size: a.file_size,
        contentType: a.content_type,
        cdnUrl: a.cdn_url,
        folderId: a.folder_id || null,
        createdAt: a.created_at,
      }))
      body.cdnFolders = rawCdnFolders
    }

    return NextResponse.json(body)

  } catch (error) {
    console.error("[Auth] Get user error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to get user")
  }
}
