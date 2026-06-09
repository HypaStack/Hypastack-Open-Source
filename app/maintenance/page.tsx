import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "503 Service Unavailable",
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#e3e3e3",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: "#1a1a1a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#888"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: 14,
              marginTop: 0,
              color: "#f0f0f0",
            }}
          >
            Under Maintenance
          </h1>

          <p
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: "#888",
              marginBottom: 32,
              marginTop: 0,
            }}
          >
            We are performing a refactor of Hypastack to significantly improve
            performance, scalability, and security. During this maintenance
            window, service availability may be intermittent. We are committed to
            completing these upgrades quickly to provide a more robust and faster
            experience. Thank you for your patience as we evolve Hypastack.
          </p>

          <a
            href="https://t.me/hypastack"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              paddingLeft: 20,
              paddingRight: 20,
              borderRadius: 12,
              backgroundColor: "#222",
              color: "#e3e3e3",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e: any) =>
              (e.currentTarget.style.backgroundColor = "#333")
            }
            onMouseLeave={(e: any) =>
              (e.currentTarget.style.backgroundColor = "#222")
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Join our Telegram channel
          </a>
        </div>
      </body>
    </html>
  )
}
