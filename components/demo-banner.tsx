"use client"

import { useState, useEffect } from "react"
import { MIcon } from "@/components/ui/material-icon"
import Link from "next/link"

const BANNER_DISMISSED_KEY = "hypastack-tos-dismissed"

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user already dismissed the banner
    const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "true"
    if (!isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(BANNER_DISMISSED_KEY, "true")
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-3 md:bottom-4 right-3 md:right-4 left-3 md:left-auto z-[100] md:max-w-md animate-fade-in-up">
      <div className="rounded-xl md:rounded-2xl bg-card border border-border p-3 md:p-4">
        <div className="flex items-start gap-2.5 md:gap-3">
          <div className="flex shrink-0 items-center justify-center pt-0.5">
            <MIcon name="shield" className="text-emerald-500" size={24} />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-xs md:text-sm font-medium text-foreground mb-1">
              Terms of Service & Acceptable Use Policy
            </p>
            <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              By accessing or using hypastack.link, you acknowledge that you have read, understood, and agree to be bound by our Terms of Service. 
              <br /><br />
              <strong className="text-foreground">Prohibited Conduct:</strong> Any attempt to exploit, compromise, disrupt, or gain unauthorized access to this service, including but not limited to reverse engineering, penetration testing without authorization, distribution of malicious content, circumvention of security measures, or any activity designed to impair service functionality is strictly prohibited and constitutes a material breach of these terms.
              <br /><br />
              <strong className="text-foreground">Enforcement:</strong> Violations will result in immediate, permanent termination of access without prior notice. All violations are presumed intentional. We reserve the right to pursue all available legal remedies, including civil litigation and referral to appropriate law enforcement authorities.
              <br /><br />
              <Link href="/policy" className="text-primary hover:underline">View our Privacy Policy</Link> to understand what data we collect and how it may be disclosed in connection with abuse investigations.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 md:top-3 md:right-3 rounded-lg p-1 md:p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
            aria-label="Dismiss"
          >
            <MIcon name="close" className="md:!text-[16px]" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
