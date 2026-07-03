export interface BlogPost {
  slug: string
  title: string
  date: string
  summary: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-i-built-hypastack",
    title: "Why I built Hypastack",
    date: "2025-03-15",
    summary:
      "I didn't plan to build a file sharing platform. I just got tired of the existing ones and decided to make something better. For myself first, and then for everyone.",
  },
  {
    slug: "on-privacy-and-keeping-it-simple",
    title: "On privacy, and keeping it simple",
    date: "2025-05-02",
    summary:
      "Privacy tools have a reputation for being complicated and kind of paranoid-feeling. I wanted Hypastack to be the opposite. Private by default, without making a big deal out of it.",
  },
  {
    slug: "the-cdn-thing",
    title: "Adding a CDN, and why it's different from everything else I built",
    date: "2025-06-01",
    summary:
      "People kept asking if they could host images for their websites on Hypastack. It wasn't what I planned, but it made sense. Here's how I thought about it.",
  },
  {
    slug: "send-large-files-without-an-email",
    title: "How to send large files without an email address",
    date: "2026-07-02",
    summary:
      "Email caps out around 25MB and most transfer sites want your address before they'll help. An honest look at the alternatives, and how I built one that never asks.",
  },
  {
    slug: "what-zero-knowledge-actually-means",
    title: "What zero-knowledge file sharing actually means",
    date: "2026-07-02",
    summary:
      "Zero-knowledge gets used as a marketing sticker a lot. Here's what it means when I say it: where the key lives, what my server can see, and what it can't protect you from.",
  },
  {
    slug: "free-cdn-for-readme-images",
    title: "A free CDN for your README images",
    date: "2026-07-02",
    summary:
      "Every project hits the same dumb wall: where does the screenshot go? The usual options, their tradeoffs, and the boring permanent image host I ended up building.",
  },
  {
    slug: "burn-after-reading-explained",
    title: "Burn after reading, explained",
    date: "2026-07-02",
    summary:
      "Some files should be seen exactly once and then stop existing. How one-time download links work on Hypastack, when to use them, and why there's no undo.",
  },
]

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug)
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}
