import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Download file on hypastack.com"
export const size = { width: 1200, height: 630 }

interface Props {
  params: Promise<{ id: string }>
}

export default async function Image({ params }: Props) {
  const { id } = await params

  let fileName = "Unknown file"
  let fileSize = ""

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v2/files/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.file) {
        fileName = data.file.customFilename || data.file.name || "Unknown file"
        const bytes = data.file.size || 0
        if (bytes > 0) {
          const k = 1024
          const sizes = ["B", "KB", "MB", "GB"]
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          fileSize = parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
        }
      }
    }
  } catch {
    // fallback to defaults
  }

  // Truncate long filenames
  const displayName = fileName.length > 40 ? fileName.slice(0, 37) + "..." : fileName

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#e8e8e8",
          fontFamily: "'Satoshi', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#0A84FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <span style={{ fontSize: "36px", fontWeight: 700 }}>Hypastack</span>
        </div>

        <div
          style={{
            backgroundColor: "#111111",
            borderRadius: "32px",
            padding: "40px 56px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <span style={{ fontSize: "28px", fontWeight: 600, color: "#e8e8e8" }}>
            {displayName}
          </span>
          {fileSize && (
            <span style={{ fontSize: "18px", color: "#888" }}>{fileSize}</span>
          )}
          <span style={{ fontSize: "16px", color: "#666", marginTop: "8px" }}>
            Click to download on hypastack.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
