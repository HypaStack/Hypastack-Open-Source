import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { readFile } from "fs/promises"
import { join } from "path"
import { MDXRemote } from "next-mdx-remote/rsc"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { getPostBySlug, getAllSlugs } from "@/lib/blog-posts"

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
    title: `${post.title} - Hypastack Blog`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.date,
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
    <main className="flex min-h-screen flex-col bg-white">

      <section className="flex-1 pt-28 pb-40">
        <div className="mx-auto max-w-[1200px] px-8 sm:px-16">

          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#999] hover:text-[#111] transition-colors mb-12 group"
          >
            <MIcon name="arrow_back" size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            All posts
          </Link>

          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-[#111] tracking-tight leading-tight mb-5">
              {post.title}
            </h1>
            <p className="text-[17px] text-[#666] leading-relaxed">
              {post.summary}
            </p>
          </header>

          <div className="w-full h-px bg-[#ebebeb] mb-12" />

          <article className="blog-prose">
            <MDXRemote source={source} />
          </article>

          <div className="mt-20 pt-10 border-t border-[#ebebeb]">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#999] hover:text-[#111] transition-colors group"
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
