import type { Metadata } from "next"
import { readFileSync } from "fs"
import { join } from "path"
import { Card, Chip, ScrollShadow, Typography } from "@heroui/react"
import { safeJsonLd } from "@/lib/seo/jsonLd"
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
      <Typography type="h2" id={id} className="scroll-mt-10 text-foreground mb-2">
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
      <section className="flex-1 pt-16 pb-40">
        {/* Sidebar is fixed to the viewport so it stays put top-to-bottom while the page scrolls; only its own list scrolls. */}
        <aside className="hidden lg:flex lg:flex-col fixed left-6 xl:left-10 top-10 bottom-8 w-[200px]">
          <ScrollShadow className="flex-1 pr-1" size={28}>
            <DocNav />
            <div aria-hidden className="h-8" />
          </ScrollShadow>
        </aside>

        <div className="px-6 sm:px-10">
          <div className="lg:pl-[240px]">
            <div className="max-w-[640px] mb-20">
              <Typography type="h1" className="text-[clamp(32px,4.6vw,52px)] text-foreground">
                Build on Hypastack
              </Typography>
              <Typography type="body" color="muted" className="mt-4 max-w-[52ch]">
                Drive your files and your CDN from your own code. Plain REST, plain JSON, no SDK to install. If you can
                make an HTTP request, you already know this API.
              </Typography>
              <Chip size="lg" className="mt-8 gap-2 font-mono max-w-full flex-wrap !shrink">
                <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted">Base URL</span>
                <code className="text-foreground">https://api.hypastack.com/v3</code>
              </Chip>
            </div>

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

            <Card className="mt-14 !gap-1 rounded-[16px] px-5 py-4">
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
      </section>
    </main>
  )
}
