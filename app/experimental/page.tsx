"use client"

import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"

interface Experiment {
  slug: string
  title: string
  description: string
}

const EXPERIMENTS: Experiment[] = [
  {
    slug: "popover",
    title: "Popover",
    description: "Popover menu variations and positioning",
  },
]

export default function ExperimentalIndex() {
  return (
    <main className="px-5 py-12 max-w-[600px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <MIcon name="science" className="text-[#555]" size={20} />
        <h1
          className="text-[24px] font-semibold tracking-[-0.02em] text-[#e3e3e3]"
          style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
        >
          Experimental
        </h1>
      </div>

      <p className="text-[14px] text-[#555] mb-8">
        Design tests and component explorations.
      </p>

      <div className="space-y-1">
        {EXPERIMENTS.map((exp) => (
          <Link
            key={exp.slug}
            href={`/experimental/${exp.slug}`}
            className="flex items-center justify-between rounded-[16px] px-4 py-3 hover:bg-[#171717] transition-colors group"
          >
            <div>
              <p className="text-[14px] font-medium text-[#e3e3e3] group-hover:text-white">
                {exp.title}
              </p>
              <p className="text-[12px] text-[#555] mt-0.5">
                {exp.description}
              </p>
            </div>
            <span className="text-[12px] text-[#333] group-hover:text-[#555] transition-colors">
              →
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
