import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph } from "@/components/legal-document"

const description = "Why Hypastack exists, a private, source-available alternative to Dropbox and WeTransfer. No ads, no data collection, EU-based servers, and free to use."

export const metadata: Metadata = {
  title: "Our Mission",
  description,
  alternates: {
    canonical: "https://hypastack.com/goal",
  },
  openGraph: {
    title: "Our Mission (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/goal",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Mission (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function Goal() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="What's our goal?"
            dates={[]}
            intro="Our goal is simple: to build a platform that guarantees absolute mathematical privacy for your data."
          >
            <LegalParagraph>
              We believe you shouldn&apos;t have to trust our servers, our administrators, or any third party to keep your files secure. In modern tech, trusting a company not to look at your data is a vulnerability. Instead of asking for your trust with promises or privacy policies, we eliminated our ability to access your data entirely through cryptography.
            </LegalParagraph>

            <LegalSection title="Eliminating the Middleman">
              <LegalParagraph>
                For too long, transferring files securely meant relying on a middleman who promised not to peek. We want to normalize the idea that file sharing should be secure by default, invisible to the host, and mathematically unbreakable by anyone who doesn&apos;t have the explicit URL.
              </LegalParagraph>
              <LegalParagraph>
                By enforcing strictly client-side AES-GCM encryption, we ensure that you, and only you, hold the keys to your data. The server is reduced to a &quot;dumb pipe&quot; that merely holds and transfers encrypted blobs of bytes, completely blind to the actual content.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="A Future of Secure Infrastructure">
              <LegalParagraph>
                Ultimately, we are striving to build infrastructure that respects user autonomy. A world where data breaches yield nothing but scrambled noise, and where the user maintains total cryptographic sovereignty over their digital assets.
              </LegalParagraph>
              <LegalParagraph>
                Whether you are sharing sensitive intellectual property, personal memories, or critical business documents, Hypastack&apos;s goal is to provide a seamless, blazing-fast network that mathematically guarantees your right to privacy.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
