import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "Terms of Service for Hypastack, a free, source-available file sharing and CDN hosting platform based in the EU."

export const metadata: Metadata = {
  title: "Terms of Service",
  description,
  alternates: {
    canonical: "https://hypastack.com/terms",
  },
  openGraph: {
    title: "Terms of Service (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/terms",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function TermsOfService() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="Terms of Service"
            dates={[
              { label: "Effective Date", value: "June 14, 2026" },
              { label: "Last Updated", value: "June 14, 2026" },
            ]}
          >
            <LegalSection title="1. Acceptance of Terms">
              <LegalParagraph lead>
                By accessing, browsing, or utilizing any portion of the Hypastack platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </LegalParagraph>
              <LegalParagraph>
                If you do not agree with any part of these terms, you must immediately cease all use of the platform. These terms constitute a legally binding agreement between you, the User, and me, the Service Provider. I reserve the right, at my sole discretion, to modify or replace these Terms at any time. Your continued use of the platform following the posting of any changes to the Terms constitutes acceptance of those changes.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="2. Service Description and Architecture">
              <LegalParagraph>
                Hypastack provides a globally distributed Content Delivery Network (CDN) and file-sharing utility. For files uploaded through this website, the service operates as a zero-knowledge transport and storage layer. It also offers unencrypted permanent hosting for public assets via my CDN pipeline, and an unencrypted developer API.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">The zero-knowledge guarantee applies only to files uploaded through this website.</strong> CDN assets are not encrypted, they are public by design and I strip only their embedded metadata. Files uploaded through the developer API are likewise not encrypted, and are readable by me. Where a third party operates an application built on the developer API, uploads made through that application reside in that developer&apos;s account and are accessible to both that developer and to me; that developer, not Hypastack, is responsible for disclosing this to their users.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">Cryptographic Sovereignty:</strong> For secure sharing, I provide the infrastructure to transmit your encrypted data. You provide the cryptographic keys locally on your device. I do not generate, transmit, receive, or store the decryption keys necessary to convert your uploaded ciphertext back into readable plaintext. Consequently, Hypastack functions purely as a &quot;dumb pipe&quot; routing encrypted blobs of data across edge nodes.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="3. User Responsibilities and Liability">
              <LegalParagraph>
                Because Hypastack operates a zero-knowledge architecture, the sole responsibility for the contents, legality, and dissemination of the uploaded data rests entirely with the User.
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Data Loss:</strong> You are solely responsible for maintaining access to your decryption keys, which are embedded in the URL fragments. Hypastack cannot recover, reset, or bypass these cryptographic locks. If you lose your URL, your encrypted data is irretrievably lost. I hold no liability for data loss due to lost keys, accidental deletion, or service interruption.</li>
                <li><strong className="text-foreground">Legality of Content:</strong> You agree not to use the platform to upload, transmit, or distribute any material that is unlawful, defamatory, obscene, or infringing upon the intellectual property rights of others. Please refer to my Acceptable Use Policy for an exhaustive list of prohibited behaviors.</li>
                <li><strong className="text-foreground">Indemnification:</strong> You agree to indemnify, defend, and hold harmless Hypastack, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses arising from your violation of these Terms or your infringement of any third-party rights.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="4. Service Availability and Modifications">
              <LegalParagraph>
                While I strive for high availability and rapid edge delivery, Hypastack is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied.
              </LegalParagraph>
              <LegalParagraph>
                I reserve the right to modify, suspend, or discontinue, temporarily or permanently, the platform or any part thereof with or without notice. I shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the service. I may also impose limits on certain features or restrict your access to parts or all of the platform without notice or liability.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="5. Intellectual Property">
              <LegalParagraph>
                You retain all rights and ownership to the original plaintext data you encrypt and upload to the platform. By uploading the encrypted ciphertext to Hypastack, you grant me a worldwide, non-exclusive, royalty-free license strictly limited to hosting, copying, transmitting, and delivering that encrypted blob across my CDN architecture to facilitate your requested downloads.
              </LegalParagraph>
              <LegalParagraph>
                The Hypastack platform, including its original code, design, logos, and underlying infrastructure algorithms, is the exclusive property of Hypastack and is protected by international copyright and trademark laws.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="6. Termination">
              <LegalParagraph>
                I may terminate or suspend your access to the platform immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the platform will immediately cease, and any associated encrypted ciphertext hosted on my network may be asynchronously purged. All provisions of the Terms which by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
