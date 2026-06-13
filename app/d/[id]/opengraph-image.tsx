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
  let ext = "FILE"
  let burnOnRead = false

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v2/files/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.file) {
        fileName = data.file.customFilename || data.file.name || "Unknown file"
        burnOnRead = !!data.file.burnOnRead
        const bytes = data.file.size || 0
        if (bytes > 0) {
          const k = 1024
          const sizes = ["B", "KB", "MB", "GB"]
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          fileSize = parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
        }
        ext = fileName.includes(".") ? (fileName.split(".").pop()?.toUpperCase() || "FILE") : "FILE"
      }
    }
  } catch {}

  const displayName = fileName.length > 36 ? fileName.slice(0, 33) + "..." : fileName

  // Fetch logo and convert to data URL — Satori can't resolve external image URLs
  let logoSrc = ""
  try {
    const logoRes = await fetch("https://r2.hypastack.com/cdn/td2jaozbj6or/og-img-logo.png")
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer()
      const b64 = Buffer.from(buf).toString("base64")
      logoSrc = `data:image/png;base64,${b64}`
    }
  } catch {}

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
          backgroundColor: "#ffffff",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "36px",
          }}
        >
          {logoSrc && <img
            src={logoSrc}
            width="52"
            height="52"
            style={{ borderRadius: 12 }}
          />}
        </div>

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "480px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* File info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px 20px",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "#111111",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                marginBottom: "10px",
                display: "flex",
              }}
            >
              {displayName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  color: "#888888",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #e5e5e5",
                  padding: "3px 8px",
                  borderRadius: "5px",
                }}
              >
                {ext}
              </div>
              {fileSize && (
                <span style={{ fontSize: "14px", color: "#888888" }}>{fileSize}</span>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              margin: "0 16px 16px",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ebebeb",
              padding: "4px",
            }}
          >
            {/* Encryption row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "40px",
                padding: "0 14px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#888888", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbbbbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Encryption
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>End-to-end</span>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", margin: "0 10px", backgroundColor: "#ebebeb" }} />

            {/* Burn row - only if burn is active */}
            {burnOnRead ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "40px",
                  padding: "0 14px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#888888", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbbbbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c-4.97 0-9-2.686-9-6v-.002C3 8.17 7.03 2 12 2s9 6.17 9 13.998V16c0 3.314-4.03 6-9 6z"/>
                  </svg>
                  Burn on read
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b" }}>Active</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "40px",
                  padding: "0 14px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#888888", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbbbbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c-4.97 0-9-2.686-9-6v-.002C3 8.17 7.03 2 12 2s9 6.17 9 13.998V16c0 3.314-4.03 6-9 6z"/>
                  </svg>
                  Privacy
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>Zero-knowledge</span>
              </div>
            )}
          </div>

          {/* Download button */}
          <div style={{ padding: "0 16px 16px", display: "flex" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                height: "44px",
                borderRadius: "8px",
                backgroundColor: "#030303",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </div>
          </div>
        </div>

        {/* Footer text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "24px",
            fontSize: "14px",
            color: "#bbbbbb",
          }}
        >
          hypastack.com · Encrypted file sharing
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
