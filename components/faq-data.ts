import { FREE_LIMITS, ULTIMATE_LIMITS, formatTierSize } from "@/constants/tier-limits"

/**
 * Landing page FAQ — single source of truth.
 * Rendered by components/faq.tsx and mirrored into FAQPage JSON-LD on the
 * homepage, so the visible answers and the structured data can never drift.
 * Size numbers are interpolated from constants/tier-limits.ts, so they stay in
 * sync with the enforced limits automatically.
 */
export const faqs = [
  {
    q: "What is Hypastack?",
    a: "Think of it as a dead-simple way to share files that doesn't creep on your data. Your files are end-to-end encrypted in your browser before upload, so we can't read them. There's also a CDN side for public assets. That part isn't encrypted (public images have to be readable), but we strip the EXIF metadata so you aren't accidentally leaking your location.",
  },
  {
    q: "Can Hypastack read my files?",
    a: "No. Files are encrypted with AES-256 in your browser before they leave your device, and the decryption key travels in the part of the link after the #, which browsers never send to any server. We only ever store scrambled bytes, so there's nothing readable for us to look at, leak, or hand over.",
  },
  {
    q: "Is Hypastack free?",
    a: "Yes. The free plan covers everyday sharing, and there are no ads on any plan. Paid plans raise the limits: bigger files, more active links, more CDN storage and custom link lifetimes. That's what pays the hosting bill.",
  },
  {
    q: "How big can my files be?",
    a: `Free accounts share files up to ${formatTierSize(FREE_LIMITS.maxNormalUploadSize)} and upload CDN assets up to ${formatTierSize(FREE_LIMITS.maxCdnFileSize)}, with ${formatTierSize(FREE_LIMITS.maxCdnStorage)} of CDN storage. Ultimate goes up to ${formatTierSize(ULTIMATE_LIMITS.maxNormalUploadSize)} per share, ${formatTierSize(ULTIMATE_LIMITS.maxCdnFileSize)} per CDN asset, and ${formatTierSize(ULTIMATE_LIMITS.maxCdnStorage)} of CDN storage.`,
  },
  {
    q: "How long do these links last?",
    a: "Depends on how heavy the file is. Small stuff stays up for 7 days, massive files get a shorter window, down to 24 hours. Paid plans multiply that and can set a custom lifetime from 1 minute to 30 days. CDN files? They're yours until you delete them.",
  },
  {
    q: "Do I need an account or an email address?",
    a: "Downloading needs nothing at all. Uploading uses an account, but not the usual kind: you pick a nickname and your browser generates a key. No emails, no passwords, no 'Sign in with Google' nonsense. If you lose that key, your account is cooked — we can't recover it because we never knew who you were.",
  },
  {
    q: "Is my stuff actually safe?",
    a: "Shares are encrypted end to end, filenames are encrypted at rest, files get random IDs on EU-based storage, and we never store IP addresses. CDN images get their EXIF/GPS junk stripped, and you can set shares to burn after the first download if you're feeling paranoid.",
  },
  {
    q: "Is Hypastack open source?",
    a: "Yes, the entire platform is open source under AGPL-3.0 — the site, the API, the background services and the desktop app. You can read the code or self-host it from github.com/HypaStack/Hypastack-Open-Source.",
  },
]
