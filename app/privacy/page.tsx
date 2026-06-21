import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Hypastack's privacy policy. No personal data collected, no tracking or logs, no IP logging, and no advertising. Your files stay private.",
}

export default function PrivacyPolicy() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold tracking-tight text-[#f7f8f8] mb-8 leading-[1.05] -ml-0.5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
            Privacy Policy
          </h1>
          
          <div className="text-sm text-[#898e97] mb-12 border-b border-[rgba(255,255,255,0.08)] pb-6">
            <p>Effective Date: June 14, 2026</p>
            <p>Last Updated: June 14, 2026</p>
          </div>
          
          <div className="space-y-16 text-[15px] leading-relaxed text-[#898e97]">
            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>1. Introduction to Zero-Knowledge</h2>
              <p className="mb-4 text-[#f7f8f8] font-medium">
                Hypastack operates on a strict zero-knowledge paradigm. This means we design our systems under the assumption that our own servers cannot be trusted with your unencrypted data.
              </p>
              <p className="mb-4">
                Unlike traditional cloud storage providers that decrypt your data on their backend, analyze it, and potentially share it with third parties, Hypastack relies exclusively on client-side encryption for its Secure File Sharing pipeline. All files uploaded through this pipeline are encrypted locally on your device using AES-GCM (256-bit) before transmission. Note that our Permanent CDN Hosting pipeline is designed for public assets and is intentionally unencrypted, as detailed below.
              </p>
              <p>
                The encryption key (found in the URL fragment <code className="text-primary font-medium">#key=...</code>) is processed only by your local browser environment. Because web browsers are architecturally designed to never transmit the URL fragment to the server during a request, it is mathematically impossible for our infrastructure to intercept, record, or utilize your decryption keys. We have no "master key", no backdoor, and no ability to decrypt your files.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>2. Information We Collect</h2>
              <p className="mb-4">
                Because of our cryptographic design, the amount of data we can collect is fundamentally limited. What we do collect is strictly necessary for operational stability, billing, and abuse prevention.
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-[#f7f8f8]">Encrypted Ciphertext & Public Assets:</strong> For Secure File Sharing, we store the raw encrypted binary data. This data is entirely opaque to us. For Permanent CDN Hosting, we store the unencrypted assets as they are intended for public distribution via direct links.</li>
                <li><strong className="text-[#f7f8f8]">Metadata:</strong> We collect non-identifying metadata necessary for routing and storage, including the total size of the file, expiration timestamps, and cryptographic parameters required by your browser to reassemble encrypted files. For encrypted shares, filenames and custom notes are also encrypted using a distinct server-side key wrapper to prevent passive metadata leakage.</li>
                <li><strong className="text-[#f7f8f8]">Account Identifiers:</strong> To maintain quotas, we use usernames, and your passwords are securely hashed before being stored in our database. We do not collect email addresses or other personally identifiable information.</li>
                <li><strong className="text-[#f7f8f8]">Bandwidth Telemetry:</strong> We monitor aggregated egress traffic at the edge node level to prevent DDoS attacks and enforce service limits. This data is anonymized and cannot be traced back to individual unencrypted file contents.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>3. Information We Do NOT Collect</h2>
              <p className="mb-4">
                Our architecture actively prevents us from collecting the following information:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-[#f7f8f8]">Decryption Keys:</strong> Never transmitted, never stored.</li>
                <li><strong className="text-[#f7f8f8]">Plaintext Passwords:</strong> We do not store or transmit your password in plaintext at any point.</li>
                <li><strong className="text-[#f7f8f8]">Unencrypted Private File Contents:</strong> For files uploaded via the Secure File Sharing pipeline, the unencrypted content is never transmitted to our servers. We cannot scan for keywords, viruses, or copyrighted material using traditional deep-packet or at-rest inspection tools on these encrypted files.</li>
                <li><strong className="text-[#f7f8f8]">IP Addresses:</strong> We do not store, log, or maintain records of your IP address in our databases or application logs. Any necessary IP-based abuse prevention or rate limiting happens ephemerally at the network edge via Cloudflare and is never stored by Hypastack.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>4. Third-Party Sharing</h2>
              <p className="mb-4">
                We do not sell, rent, or trade your personal information or metadata. We only share operational telemetry with infrastructure partners (such as Cloudflare R2 for edge delivery) strictly for the purpose of transmitting your encrypted data. These partners are legally and technically constrained from accessing the unencrypted contents of your files, as they too lack the decryption keys.
              </p>
              <p>
                In the event of a valid, legally binding subpoena or court order, we will comply with law enforcement. However, because we operate a zero-knowledge service, we can only provide the encrypted ciphertext blocks and the basic metadata associated with them. We cannot provide the decryption keys or the unencrypted contents of the files, as we do not possess them.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>5. Data Retention and Deletion</h2>
              <p className="mb-4">
                When a file reaches its user-defined expiration date, or if a "Burn on Read" condition is triggered, the cryptographic keys associated with the edge routing are immediately invalidated, and an asynchronous deletion job is dispatched to permanently purge the ciphertext from our CDN storage buckets.
              </p>
              <p>
                This deletion is irreversible. We do not keep "soft deletes" or hidden backups of user-uploaded files. Once a file is purged, it is mathematically and physically eradicated from the Hypastack network.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>6. Security and Breaches</h2>
              <p>
                In the unlikely event of a catastrophic breach of our infrastructure, the structural integrity of your privacy remains intact. Because the files are encrypted client-side, any data exfiltrated by an attacker would be entirely unreadable. The only risk in such a scenario is service disruption, not data exposure.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
