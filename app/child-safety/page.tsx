import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "Hypastack's commitment to child safety, including proactive CSAM detection and prevention measures."

export const metadata: Metadata = {
  title: "Child Safety Policy",
  description,
  alternates: {
    canonical: "https://hypastack.com/child-safety",
  },
  openGraph: {
    title: "Child Safety Policy (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/child-safety",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Child Safety Policy (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function ChildSafety() {
  return (
    <main className="flex min-h-screen flex-col bg-black">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="Child Safety Policy"
            dates={[{ label: "Effective", value: "May 7, 2026" }]}
            intro="Hypastack has zero tolerance for child sexual abuse material (CSAM). This is not negotiable."
          >
            <LegalSection title="My Position">
              <LegalParagraph>
                Any content that sexually exploits or endangers children will be removed immediately
                upon discovery or report. The associated account will be terminated. All available
                information will be reported to NCMEC (National Center for Missing &amp; Exploited Children)
                and relevant law enforcement.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="What I Can Provide to Authorities">
              <LegalParagraph>
                For files uploaded through the website, my zero-knowledge architecture limits the data I can provide to:
              </LegalParagraph>
              <LegalList>
                <li>The account ID</li>
                <li>Account creation timestamp</li>
                <li>Last activity timestamp</li>
                <li>File metadata (encrypted filename, size, upload time)</li>
                <li>The file content itself (before deletion)</li>
              </LegalList>
              <LegalParagraph>
                CDN assets and files uploaded through the developer API are not encrypted. For those,
                I can provide the content itself in readable form, and I will do so when lawfully
                required.
              </LegalParagraph>
              <LegalParagraph>
                In no case do I have email addresses or real identities. I do hold a one-way hashed
                version of IP addresses used briefly for rate limiting, it cannot be reversed back to
                the original address, but I will provide it when lawfully required, since it can still
                be matched against a specific IP if authorities already have one. I am transparent
                about these limitations. They are a consequence of the account model and the
                zero-knowledge pipeline, not an attempt to shield abusers.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Prevention Measures">
              <LegalList>
                <li>Dangerous file types (executables, scripts) are strictly blocked for CDN uploads</li>
                <li>File type verification checks magic bytes, not just extensions</li>
                <li>Rate limits prevent mass-upload abuse</li>
                <li>CAPTCHA verification on uploads (Cloudflare Turnstile)</li>
                <li>Temporary files auto-expire within 1–7 days</li>
                <li>Inactive accounts are purged after 7 days</li>
              </LegalList>
              <LegalParagraph>
                For encrypted file shares, I cannot proactively scan contents. I rely on reports and the technical barriers above. CDN asset uploads are not encrypted and will be subject to client-side content scanning in a future update.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Age Requirements">
              <LegalParagraph>
                Minimum age to use Hypastack: 18.
                I cannot verify age because I do not collect identity information.
                If I learn a user is underage, I delete the account.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Reporting">
              <LegalParagraph>
                If you encounter CSAM or any content that endangers children, send the file URL (without any <code className="text-primary font-medium">#...</code> fragment) via <strong className="text-foreground"><a href="mailto:usekiko@hypamail.me" className="underline hover:opacity-70 transition-opacity">usekiko@hypamail.me</a></strong>. I will act within 24 hours.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">Do not send me the decryption key.</strong> I will not ask for it. Receiving and decrypting content to verify a CSAM report creates direct legal liability for me. I do not and will not do this.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">Do not screenshot or preserve CSAM.</strong> Simply send me the URL so I can delete the file immediately, and report it directly to the <a href="https://www.missingkids.org/gethelpnow/cybertipline" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">NCMEC CyberTipline</a>. That is all I need from you.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
