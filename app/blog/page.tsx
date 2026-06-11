import type { Metadata } from "next"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { blogPosts } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes from Kiko, the developer behind Hypastack. On privacy, building in public and making software that respects people.",
  openGraph: {
    title: "Blog - Hypastack",
    description:
      "Notes from Kiko, the developer behind Hypastack and noinfo.bio.",
    type: "website",
  },
}

export default function BlogPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1200px] px-8 sm:px-16">

          <div className="mb-16">
            <p className="text-[13px] font-medium text-[#999] uppercase tracking-widest mb-4">
              Blog
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#111] tracking-tight leading-tight mb-5">
              Thoughts from the build
            </h1>
            <p className="text-[17px] text-[#666] leading-relaxed max-w-[520px]">
              I'm Kiko, a solo developer from Europe. This is where I write about
              building Hypastack, privacy and whatever else is on my mind.
            </p>
          </div>

          <div className="w-full h-px bg-[#ebebeb] mb-12" />

          <div className="flex flex-col divide-y divide-[#ebebeb]">
            {blogPosts.map((post) => (
              <div
                key={post.slug}
                className="py-10 flex flex-col gap-3"
              >
                <h2 className="text-[22px] md:text-[24px] font-semibold text-[#111] tracking-tight leading-snug">
                  {post.title}
                </h2>

                <p className="text-[15px] text-[#777] leading-relaxed">
                  {post.summary}
                </p>

                <div className="mt-2">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                    style={{ height: 38, paddingLeft: 18, paddingRight: 18, borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Read post
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
