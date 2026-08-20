import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "How Hypastack complies with COPPA and GDPR regulations, and exactly what account data is collected."

export const metadata: Metadata = {
  title: "COPPA & GDPR Compliance",
  description,
  alternates: {
    canonical: "https://hypastack.com/coppa-gdpr",
  },
  openGraph: {
    title: "COPPA & GDPR Compliance (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/coppa-gdpr",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "COPPA & GDPR Compliance (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function CoppaGdpr() {
  return (
    <main className="flex min-h-screen flex-col bg-black">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="COPPA & GDPR Compliance"
            dates={[
              { label: "Effective Date", value: "June 14, 2026" },
              { label: "Last Updated", value: "June 14, 2026" },
            ]}
          >
            <LegalSection title="1. Zero-Knowledge and Regulatory Compliance">
              <LegalParagraph lead>
                Regulatory frameworks like the General Data Protection Regulation (GDPR) and the Children&apos;s Online Privacy Protection Act (COPPA) are primarily designed to govern the collection, processing, and sale of Personally Identifiable Information (PII).
              </LegalParagraph>
              <LegalParagraph>
                Hypastack approaches these regulations from a unique architectural standpoint by eliminating the collection of plaintext data altogether. Because my infrastructure relies exclusively on client-side AES-GCM encryption, I am technically and mathematically incapable of processing, identifying, or analyzing the contents of the files uploaded to my network.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="2. GDPR (General Data Protection Regulation)">
              <LegalParagraph>
                The GDPR imposes strict rules on those who host and process the personal data of EU citizens. Hypastack acts strictly as a data transport and storage conduit for encrypted ciphertext.
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Right to be Forgotten (Erasure):</strong> You have the absolute right to delete your data. Because you control the decryption keys, you can unilaterally render the data unreadable at any time by simply destroying your URL. Furthermore, you can actively trigger a deletion of the ciphertext from my edge nodes at any time using my platform tools, fulfilling the right to erasure instantly.</li>
                <li><strong className="text-foreground">Data Minimization:</strong> I practice real data minimization, though not zero collection, and I would rather be accurate than make an absolute claim I cannot back up. There is no account registration with email. Accounts authenticate with a randomly generated account ID and a passkey that I store as a one-way hash, never in readable form. Your account ID and encrypted nickname are personal data under GDPR, since they can identify a specific account over time even without revealing who you are. I do not run analytics on your encrypted files.</li>
                <li><strong className="text-foreground">Data Processing:</strong> Because the server never possesses the decryption keys, I do not &quot;process&quot; your personal data in the traditional sense. I merely route indistinguishable blocks of ciphertext. Any PII contained within your files remains entirely obfuscated from my servers.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="3. COPPA (Children's Online Privacy Protection Act)">
              <LegalParagraph>
                COPPA regulates the online collection of personal information from children under the age of 13 in the United States.
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Age Restrictions:</strong> Hypastack is not directed at children under the age of 13. I do not knowingly collect personal information from children under 13. If you are under 13, you are strictly prohibited from using my services or creating an account.</li>
                <li><strong className="text-foreground">No Intentional Collection:</strong> I do not monitor or profile the age of my users based on their uploaded content. For website uploads I am technically unable to, since the content is encrypted before it reaches me; for CDN assets and developer API uploads I simply do not. I rely on the assertion that users accessing my tools are of legal age to form a binding contract.</li>
                <li><strong className="text-foreground">Remediation:</strong> If I obtain actual, verifiable knowledge that an account belongs to a child under the age of 13, I will immediately terminate the account and permanently purge all associated data from my network in compliance with COPPA, whether that data is encrypted ciphertext or not.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="4. Submitting a Privacy Request">
              <LegalParagraph>
                If you are an EU citizen seeking to execute a Subject Access Request (SAR), or a parent or guardian seeking COPPA remediation, please contact me via <strong className="text-foreground"><a href="mailto:usekiko@hypamail.me" className="underline hover:opacity-70 transition-opacity">usekiko@hypamail.me</a></strong>.
              </LegalParagraph>
              <LegalParagraph>
                What I can return depends on how the data reached me, and I would rather set that out precisely than promise something inaccurate:
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Files uploaded through this website:</strong> I can provide only the encrypted ciphertext blocks stored on my servers. I cannot provide a decrypted version, nor recover your lost keys, because I do not possess them. This is a genuine technical limitation, not a refusal.</li>
                <li><strong className="text-foreground">CDN assets:</strong> These are not encrypted. I can provide the files themselves, along with their stored metadata.</li>
                <li><strong className="text-foreground">Files uploaded through the developer API:</strong> These are not encrypted either. I can provide the actual contents. Where the upload was made through a third party&apos;s application, the file resides in that developer&apos;s account and that developer is the controller of it. I can confirm what I hold, but requests concerning that content should also be directed to them.</li>
              </LegalList>
              <LegalParagraph>
                In every case I can provide the account metadata I hold, which is deliberately minimal: no email address, no readable passkey (I only hold a one-way hash of it), and a nickname that is itself encrypted in your browser before it reaches me. I do hold a hashed, one-way version of your IP address, used only for short-lived rate limiting, see my <a href="/privacy" className="underline hover:opacity-70 transition-opacity">Privacy Policy</a> for exactly how that works.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
