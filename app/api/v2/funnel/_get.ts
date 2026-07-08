import { NextResponse } from "next/server"
import { getFunnelsByUserId, getFunnelFilesByUserId } from "@/lib/models/funnelModel"

// The owner inbox: active drop links (share/copy/delete) plus received files
// (each carries the crypto material the browser needs to decrypt it locally).
export async function handleFunnelList({
  user,
}: {
  user: { userId: string }
}): Promise<Response> {
  const [funnels, files] = await Promise.all([
    getFunnelsByUserId(user.userId),
    getFunnelFilesByUserId(user.userId),
  ])

  return NextResponse.json({
    funnels: funnels
      .filter((f) => f.status === "active")
      .map((f) => ({ id: f.id, slug: f.slug, createdAt: f.created_at })),
    files: files.map((f) => ({
      id: f.id,
      nameEncrypted: f.name_encrypted,
      wrappedKey: f.wrapped_key,
      wrappedPrivateKey: f.private_key_wrapped,
      fileSize: f.file_size,
      contentType: f.content_type,
      chunkSize: f.encryption_chunk_size,
      totalParts: f.encryption_total_parts,
      createdAt: f.created_at,
    })),
  })
}
