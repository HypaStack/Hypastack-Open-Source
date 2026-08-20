import type { Metadata } from "next"
import { readFileSync } from "fs"
import { join } from "path"
import { Card, Chip, Typography } from "@heroui/react"
import { safeJsonLd } from "@/lib/seo/jsonLd"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { DocNav } from "@/components/docs/doc-nav"
import { DocGuide } from "@/components/docs/doc-guide"
import { EndpointCard } from "@/components/docs/endpoint-card"
import { CodeBlock } from "@/components/docs/code-block"
import { FILE_ENDPOINTS, CDN_ENDPOINTS } from "@/lib/docs/v3-endpoints"
import { PREVIEW_URL } from "@/constants"

const description = "The Hypastack REST API. Upload, list and delete files and CDN assets from your own code. Plain JSON, one error shape, no SDK required."

export const metadata: Metadata = {
  title: "Developer API",
  description,
  alternates: { canonical: "https://hypastack.com/docs/developer-api" },
  openGraph: {
    title: "Developer API (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/docs/developer-api",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer API (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

// Read at build time so the documented example and the script people actually
// run are the same bytes, they cannot drift apart.
const REFERENCE_SCRIPT = readFileSync(join(process.cwd(), "scripts/v3-reference.mjs"), "utf8")

function SectionHeading({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-20 mb-6">
      <Typography type="h2" id={id} className="scroll-mt-28 text-foreground mb-2">
        {title}
      </Typography>
      <Typography type="body" color="muted" className="max-w-[62ch]">{children}</Typography>
    </div>
  )
}

export default function DeveloperApiDocs() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://hypastack.com" },
              { "@type": "ListItem", position: 2, name: "Developer API", item: "https://hypastack.com/docs/developer-api" },
            ],
          }),
        }}
      />
      <Navbar />

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1180px] px-6 sm:px-10">
          {/* Hero, centred with the same soft spotlight the marketing pages use */}
          <div className="relative text-center mb-20">
            <div className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 w-[440px] max-w-[85vw] h-[260px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.09),transparent_70%)] blur-2xl" />
            <Typography type="body-xs" weight="semibold" className="relative tracking-[0.14em] uppercase text-muted mb-4">
              Developer API · v3
            </Typography>
            <Typography type="h1" className="relative text-[clamp(38px,4.6vw,58px)] text-foreground">
              Build on Hypastack
            </Typography>
            <Typography type="body" color="muted" className="relative mt-4 max-w-[52ch] mx-auto">
              Drive your files and your CDN from your own code. Plain REST, plain JSON, no SDK to install. If you can
              make an HTTP request, you already know this API.
            </Typography>
            <Chip size="lg" variant="soft" className="relative mt-8 gap-3">
              <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted">Base URL</span>
              <code className="text-[13px] text-foreground font-mono">https://api.hypastack.com/v3</code>
            </Chip>
          </div>

          <div className="flex gap-12">
            {/* Fixed height (not max-height) is what makes this scroll, self-start stops it stretching. */}
            <aside
              className="hidden lg:block w-[190px] shrink-0 self-start sticky top-28 h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain pr-1"
              style={{
                maskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
              }}
            >
              <DocNav />
              <div aria-hidden className="h-8" />
            </aside>

            <div className="min-w-0 flex-1 max-w-[760px]">
              <DocGuide />

              <SectionHeading id="files" title="Files">
                Expiring file storage. Every file has a lifetime after which it deletes itself. Filenames are encrypted
                at rest, contents uploaded through the API are not. See Encryption above before you build on this.
              </SectionHeading>
              {FILE_ENDPOINTS.map((endpoint) => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} />
              ))}

              <SectionHeading id="cdn" title="CDN">
                Public, permanent assets on a global edge. Images are re-encoded on upload and their EXIF, GPS and
                camera metadata is stripped.
              </SectionHeading>
              {CDN_ENDPOINTS.map((endpoint) => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} />
              ))}

              <SectionHeading id="reference-script" title="Full example">
                Everything above, in one runnable file with no dependencies. Save it, set your key, and run it. It uploads
                a file and a CDN asset, reads them back, swaps the asset in place, then deletes both.
              </SectionHeading>
              <CodeBlock label="v3-reference.mjs" code={REFERENCE_SCRIPT} />

              <Card variant="transparent" className="mt-14 !gap-1 rounded-[16px] border !border-solid border-white/10 bg-overlay px-5 py-4">
                <Typography type="body-sm" weight="medium" className="text-foreground">Something not working?</Typography>
                <Typography type="body-sm" color="muted" className="leading-relaxed">
                  Grab the <code className="text-foreground font-mono">request_id</code> from the response and send it to{" "}
                  <a href="mailto:usekiko@hypamail.me" className="text-foreground underline underline-offset-2">
                    usekiko@hypamail.me
                  </a>
                  . With that one string I can find exactly what happened.
                </Typography>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
