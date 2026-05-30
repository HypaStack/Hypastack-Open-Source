import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "System Status | hypastack.com",
  description:
    "Live infrastructure metrics for Hypastack — PostgreSQL latency, R2 storage speeds, authentication benchmarks, and cryptography performance. Real-time via WebSocket.",
  robots: { index: true, follow: true },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
