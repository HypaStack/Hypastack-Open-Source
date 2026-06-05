import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "COPPA & GDPR Compliance",
  description: "How Hypastack complies with COPPA and GDPR regulations. No personal data is collected or stored.",
}

export default function CoppaGdpr() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            COPPA & GDPR Compliance
          </h1>
          
          <div className="text-sm text-muted-foreground mb-12 border-b border-border pb-6">
            <p>Effective Date: May 7, 2026</p>
            <p>Last Updated: May 25, 2026</p>
          </div>
          
          <div className="space-y-12 text-[15px] leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">1. Zero-Knowledge and Regulatory Compliance</h2>
              <p className="mb-4 text-foreground font-medium">
                Regulatory frameworks like the General Data Protection Regulation (GDPR) and the Children's Online Privacy Protection Act (COPPA) are primarily designed to govern the collection, processing, and sale of Personally Identifiable Information (PII).
              </p>
              <p>
                Hypastack approaches these regulations from a unique architectural standpoint: by eliminating the collection of plaintext data altogether. Because our infrastructure relies exclusively on client-side AES-GCM encryption, we are technically and mathematically incapable of processing, identifying, or analyzing the contents of the files uploaded to our network.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">2. GDPR (General Data Protection Regulation)</h2>
              <p className="mb-4">
                The GDPR imposes strict rules on those who host and process the personal data of EU citizens. Hypastack acts strictly as a data transport and storage conduit for encrypted ciphertext.
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">Right to be Forgotten (Erasure):</strong> You have the absolute right to delete your data. Because you control the decryption keys, you can unilaterally render the data unreadable at any time by simply destroying your URL. Furthermore, you can actively trigger a deletion of the ciphertext from our edge nodes at any time using our platform tools, fulfilling the right to erasure instantly.</li>
                <li><strong className="text-foreground">Data Minimization:</strong> We practice absolute data minimization. We collect zero PII. There is no account registration with email — users authenticate with a cryptographic access key generated locally on their device. We do not run analytics on your encrypted files.</li>
                <li><strong className="text-foreground">Data Processing:</strong> Because the server never possesses the decryption keys, we do not "process" your personal data in the traditional sense. We merely route indistinguishable blocks of ciphertext. Any PII contained within your files remains entirely obfuscated from our servers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">3. COPPA (Children's Online Privacy Protection Act)</h2>
              <p className="mb-4">
                COPPA regulates the online collection of personal information from children under the age of 13 in the United States.
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">Age Restrictions:</strong> Hypastack is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you are under 13, you are strictly prohibited from using our services or creating an account.</li>
                <li><strong className="text-foreground">No Intentional Collection:</strong> Because we operate a zero-knowledge architecture, we do not monitor or profile the age of our users based on their uploaded content. We rely on the assertion that users accessing our tools are of legal age to form a binding contract.</li>
                <li><strong className="text-foreground">Remediation:</strong> If we obtain actual, verifiable knowledge that an account belongs to a child under the age of 13, we will immediately terminate the account and permanently purge all associated encrypted ciphertext from our network in compliance with COPPA.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">4. Submitting a Privacy Request</h2>
              <p className="mb-4">
                If you are an EU citizen seeking to execute a Subject Access Request (SAR), or a parent/guardian seeking COPPA remediation, please contact our Data Protection Officer at <strong>privacy@hypastack.com</strong>.
              </p>
              <p>
                Please note that because of our zero-knowledge architecture, if you request an export of "your data," we can only provide you with the encrypted ciphertext blocks stored on our servers. We cannot provide you with a decrypted version of your files, nor can we recover your lost keys, as we do not possess them.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
