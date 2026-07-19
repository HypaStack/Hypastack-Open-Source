import type { Metadata } from "next"
import { readFileSync } from "fs"
import { join } from "path"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { DocNav } from "@/components/docs/doc-nav"
import { DocGuide } from "@/components/docs/doc-guide"
import { EndpointCard } from "@/components/docs/endpoint-card"
import { CodeBlock } from "@/components/docs/code-block"
import { HEADING_FONT, PANEL } from "@/components/docs/doc-style"
import { FILE_ENDPOINTS, CDN_ENDPOINTS } from "@/lib/docs/v3-endpoints"

export const metadata: Metadata = {
  title: "Developer API — Hypastack",
  description:
    "The Hypastack REST API. Upload, list and delete files and CDN assets from your own code. Plain JSON, one error shape, no SDK required.",
  alternates: { canonical: "https://hypastack.com/docs/developer-api" },
}

// Read at build time so the documented example and the script people actually
// run are the same bytes — they cannot drift apart.
const REFERENCE_SCRIPT = readFileSync(join(process.cwd(), "scripts/v3-reference.mjs"), "utf8")

function SectionHeading({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-20 mb-6">
      <h2
        id={id}
        className="scroll-mt-28 text-[27px] font-semibold tracking-tight text-[#f7f8f8] mb-2"
        style={HEADING_FONT}
      >
        {title}
      </h2>
      <p className="text-[15px] text-[#898e97] leading-[1.75] max-w-[62ch]">{children}</p>
    </div>
  )
}

export default function DeveloperApiDocs() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1180px] px-6 sm:px-10">
          {/* Hero, centred with the same soft spotlight the marketing pages use */}
          <div className="relative text-center mb-20">
            <div className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 w-[440px] max-w-[85vw] h-[260px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.09),transparent_70%)] blur-2xl" />
            <p className="relative text-[11px] font-semibold tracking-[0.14em] uppercase text-[#5a5f66] mb-4">
              Developer API · v3
            </p>
            <h1
              className="relative text-[clamp(38px,4.6vw,58px)] font-bold tracking-tight text-[#f7f8f8] leading-[1.05]"
              style={HEADING_FONT}
            >
              Build on Hypastack
            </h1>
            <p className="relative mt-4 text-[16px] text-[#898e97] leading-relaxed max-w-[52ch] mx-auto">
              Drive your files and your CDN from your own code. Plain REST, plain JSON, no SDK to install. If you can
              make an HTTP request, you already know this API.
            </p>
            <div
              className="relative inline-flex items-center gap-3 mt-8 px-4 py-2.5"
              style={{ ...PANEL, borderRadius: 999 }}
            >
              <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-[#5a5f66]">Base URL</span>
              <code className="text-[13px] text-[#f7f8f8] font-mono">https://api.hypastack.com/v3</code>
            </div>
          </div>

          <div className="flex gap-12">
            <aside className="hidden lg:block w-[190px] shrink-0">
              <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
                <DocNav />
              </div>
            </aside>

            <div className="min-w-0 flex-1 max-w-[760px]">
              <DocGuide />

              <SectionHeading id="files" title="Files">
                Private, expiring file shares. Uploads are encrypted at rest, filenames included, and every file has a
                lifetime after which it deletes itself.
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
                Everything above, in one runnable file with no dependencies. Save it, set your key, run it — it uploads
                a file and a CDN asset, reads them back, swaps the asset in place, then deletes both.
              </SectionHeading>
              <CodeBlock label="v3-reference.mjs" code={REFERENCE_SCRIPT} />

              <div className="mt-14 px-5 py-4" style={{ ...PANEL, borderRadius: 16 }}>
                <p className="text-[14px] text-[#f7f8f8] font-medium mb-1">Something not working?</p>
                <p className="text-[13.5px] text-[#898e97] leading-relaxed">
                  Grab the <code className="text-[#f7f8f8] font-mono">request_id</code> from the response and send it to{" "}
                  <a href="mailto:usekiko@hypamail.me" className="text-[#f7f8f8] underline underline-offset-2">
                    usekiko@hypamail.me
                  </a>
                  . With that one string I can find exactly what happened.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
