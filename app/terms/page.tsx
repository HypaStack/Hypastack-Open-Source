import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Hypastack's encrypted file sharing platform and CDN hosting services.",
}

export default function TermsOfService() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          
          <div className="text-sm text-muted-foreground mb-12 border-b border-border pb-6">
            <p>Effective Date: June 14, 2026</p>
            <p>Last Updated: June 14, 2026</p>
          </div>
          
          <div className="space-y-12 text-[15px] leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">1. Acceptance of Terms</h2>
              <p className="mb-4 text-foreground font-medium">
                By accessing, browsing, or utilizing any portion of the Hypastack platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <p>
                If you do not agree with any part of these terms, you must immediately cease all use of the platform. These terms constitute a legally binding agreement between you, the User, and me, the Service Provider. I reserve the right, at my sole discretion, to modify or replace these Terms at any time. Your continued use of the platform following the posting of any changes to the Terms constitutes acceptance of those changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">2. Service Description and Architecture</h2>
              <p className="mb-4">
                Hypastack provides a globally distributed Content Delivery Network (CDN) and file-sharing utility designed around the principles of absolute mathematical privacy. The service operates strictly as a zero-knowledge transport and storage layer for secure file sharing, while also offering unencrypted permanent hosting for public assets via my CDN pipeline.
              </p>
              <p>
                <strong>Cryptographic Sovereignty:</strong> For secure sharing, I provide the infrastructure to transmit your encrypted data. You provide the cryptographic keys locally on your device. I do not generate, transmit, receive, or store the decryption keys necessary to convert your uploaded ciphertext back into readable plaintext. Consequently, Hypastack functions purely as a "dumb pipe" routing encrypted blobs of data across edge nodes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">3. User Responsibilities and Liability</h2>
              <p className="mb-4">
                Because Hypastack operates a zero-knowledge architecture, the sole responsibility for the contents, legality, and dissemination of the uploaded data rests entirely with the User. 
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">Data Loss:</strong> You are solely responsible for maintaining access to your decryption keys, which are embedded in the URL fragments. Hypastack cannot recover, reset, or bypass these cryptographic locks. If you lose your URL, your encrypted data is irretrievably lost. I hold no liability for data loss due to lost keys, accidental deletion, or service interruption.</li>
                <li><strong className="text-foreground">Legality of Content:</strong> You agree not to use the platform to upload, transmit, or distribute any material that is unlawful, defamatory, obscene, or infringing upon the intellectual property rights of others. Please refer to my Acceptable Use Policy for an exhaustive list of prohibited behaviors.</li>
                <li><strong className="text-foreground">Indemnification:</strong> You agree to indemnify, defend, and hold harmless Hypastack, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses arising from your violation of these Terms or your infringement of any third-party rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">4. Service Availability and Modifications</h2>
              <p className="mb-4">
                While I strive for high availability and rapid edge delivery, Hypastack is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied.
              </p>
              <p>
                I reserve the right to modify, suspend, or discontinue, temporarily or permanently, the platform or any part thereof with or without notice. I shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the service. I may also impose limits on certain features or restrict your access to parts or all of the platform without notice or liability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">5. Intellectual Property</h2>
              <p className="mb-4">
                You retain all rights and ownership to the original plaintext data you encrypt and upload to the platform. By uploading the encrypted ciphertext to Hypastack, you grant me a worldwide, non-exclusive, royalty-free license strictly limited to hosting, copying, transmitting, and delivering that encrypted blob across my CDN architecture to facilitate your requested downloads.
              </p>
              <p>
                The Hypastack platform, including its original code, design, logos, and underlying infrastructure algorithms, is the exclusive property of Hypastack and is protected by international copyright and trademark laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">6. Termination</h2>
              <p>
                I may terminate or suspend your access to the platform immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the platform will immediately cease, and any associated encrypted ciphertext hosted on my network may be asynchronously purged. All provisions of the Terms which by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
