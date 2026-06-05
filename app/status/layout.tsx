import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Live infrastructure metrics for Hypastack. Database latency, storage speeds, authentication benchmarks and cryptography performance. Real-time monitoring.",
  robots: { index: true, follow: true },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
