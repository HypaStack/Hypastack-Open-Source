import type { Metadata } from "next"
import { safeJsonLd } from "@/lib/seo/jsonLd"
import { notFound } from "next/navigation"
import Link from "next/link"
import { readFile } from "fs/promises"
import { join } from "path"
import { MDXRemote } from "next-mdx-remote/rsc"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { getPostBySlug, getAllSlugs } from "@/lib/blogPosts"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    // absolute: skip the root "%s | Hypastack" template to avoid double branding
    title: { absolute: `${post.title} - Hypastack Blog` },
    description: post.summary,
    authors: [{ name: "Kiko", url: "https://usekiko.com" }],
    alternates: {
      canonical: `https://hypastack.com/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.date,
      url: `https://hypastack.com/blog/${slug}`,
      authors: ["Kiko"],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const filePath = join(process.cwd(), "content", "blog", `${slug}.mdx`)
  let source: string
  try {
    source = await readFile(filePath, "utf-8")
  } catch {
    notFound()
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary,
            datePublished: post.date,
            url: `https://hypastack.com/blog/${slug}`,
            mainEntityOfPage: `https://hypastack.com/blog/${slug}`,
            author: {
              "@type": "Person",
              name: "Kiko",
              url: "https://usekiko.com",
            },
            publisher: {
              "@id": "https://hypastack.com/#organization",
            },
            inLanguage: "en-US",
          }),
        }}
      />

      <section className="flex-1 pt-28 pb-40">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">

          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#898e97] hover:text-[#f7f8f8] transition-colors mb-12 group"
          >
            <MIcon name="arrow_back" size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            All posts
          </Link>

          <header className="mb-12">
            <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold text-[#f7f8f8] tracking-tight leading-[1.05] -ml-0.5 mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              {post.title}
            </h1>
            <p className="text-[17px] text-[#898e97] leading-relaxed">
              {post.summary}
            </p>
          </header>

          <div className="w-full h-px bg-[rgba(255,255,255,0.08)] mb-12" />

          <article className="blog-prose">
            <MDXRemote source={source} />
          </article>

          <div className="mt-20 pt-10 border-t border-[rgba(255,255,255,0.08)]">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#898e97] hover:text-[#f7f8f8] transition-colors group"
            >
              <MIcon name="arrow_back" size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to all posts
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
