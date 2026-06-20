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
    <main className="flex min-h-screen flex-col bg-[#08090a]">

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1200px] px-8 sm:px-16">

          <div className="mb-16">
            <p className="text-[13px] font-medium text-[#898e97] uppercase tracking-widest mb-4">
              Blog
            </p>
            <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold tracking-tight text-[#f7f8f8] mb-8 leading-[1.05] -ml-0.5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              Thoughts from the build
            </h1>
            <p className="text-[17px] text-[#898e97] leading-relaxed max-w-[520px]">
              I'm Kiko, a solo developer from Europe. This is where I write about
              building Hypastack, privacy and whatever else is on my mind.
            </p>
          </div>

          <div className="w-full h-px bg-[rgba(255,255,255,0.08)] mb-12" />

          <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.08)]">
            {blogPosts.map((post) => (
              <div
                key={post.slug}
                className="py-10 flex flex-col gap-3"
              >
                <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                  {post.title}
                </h2>

                <p className="text-[15px] text-[#898e97] leading-relaxed">
                  {post.summary}
                </p>

                <div className="mt-4">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center justify-center bg-[#f7f8f8] text-[#08090a] hover:bg-white active:scale-[0.98] transition-all duration-150 rounded-full font-semibold px-6 py-2.5 text-[14px]"
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
