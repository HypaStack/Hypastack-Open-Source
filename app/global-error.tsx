"use client"

// Last-resort boundary: catches crashes in the root layout itself, where
// globals.css and the UI kit are unavailable. Must render its own <html>/<body>
// and style inline — keep it dependency-free.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090a",
          color: "#f7f8f8",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            margin: "0 16px",
            background: "#0a0b0c",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: 24,
            textAlign: "left",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "#898e97" }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error?.digest && (
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 11,
                fontFamily: "monospace",
                color: "#6b7075",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#08090a",
                background: "#f7f8f8",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#f7f8f8",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
