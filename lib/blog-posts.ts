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
]

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug)
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}
