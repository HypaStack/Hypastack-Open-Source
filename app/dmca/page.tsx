import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "Hypastack's process for handling copyright takedown requests under the Digital Millennium Copyright Act."

export const metadata: Metadata = {
  title: "DMCA Policy",
  description,
  alternates: {
    canonical: "https://hypastack.com/dmca",
  },
  openGraph: {
    title: "DMCA Policy (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/dmca",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "DMCA Policy (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function DmcaPolicy() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="DMCA Policy"
            dates={[{ label: "Effective", value: "May 7, 2026" }]}
            intro="Hypastack respects copyright. If you believe content hosted on my platform infringes your copyright, you can submit a takedown request."
          >
            <LegalSection title="How to File a Takedown">
              <LegalParagraph>
                Send a message via <strong className="text-foreground"><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong> with:
              </LegalParagraph>
              <LegalList>
                <li>The URL of the infringing content on Hypastack</li>
                <li>A description of the copyrighted work being infringed</li>
                <li>Your contact information</li>
                <li>A statement that you have a good-faith belief the use is not authorized</li>
                <li>A statement under penalty of perjury that the information is accurate and you are the copyright owner or authorized to act on their behalf</li>
                <li>Your physical or electronic signature</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="What I Do">
              <LegalParagraph>
                When I receive a valid DMCA notice, I remove the content. I cannot reliably notify
                the uploader, I do not have their email address or any contact information, whether
                the file was encrypted or not.
              </LegalParagraph>
              <LegalParagraph>
                If the content was shared via a temporary link, it may have already expired
                and been automatically deleted before I process the request.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Counter-Notification">
              <LegalParagraph>
                If your content was removed and you believe it was not infringing, you may submit
                a counter-notification via <strong className="text-foreground"><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong> with:
              </LegalParagraph>
              <LegalList>
                <li>Your contact information</li>
                <li>Identification of the removed content and its original URL</li>
                <li>A statement under penalty of perjury that you believe the content was removed by mistake</li>
                <li>Consent to jurisdiction of your local federal court</li>
                <li>Your physical or electronic signature</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="Repeat Infringers">
              <LegalParagraph>
                I will terminate accounts of repeat infringers when I can identify them. Given
                my account model, identification is limited to the account ID and
                associated file records.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Contact">
              <LegalParagraph>
                Telegram: <strong className="text-foreground"><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong>
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
