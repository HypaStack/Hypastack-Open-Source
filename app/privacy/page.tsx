import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "Hypastack's privacy policy. What I collect, why, how long I keep it, and your rights under GDPR."

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: {
    canonical: "https://hypastack.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/privacy",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function PrivacyPolicy() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="Privacy Policy"
            dates={[
              { label: "Effective Date", value: "June 14, 2026" },
              { label: "Last Updated", value: "August 19, 2026" },
            ]}
          >
            <LegalSection title="1. Introduction to Zero-Knowledge">
              <LegalParagraph lead>
                Hypastack operates on a strict zero-knowledge paradigm for files uploaded through this website. This means I design my systems under the assumption that my own servers cannot be trusted with your unencrypted data.
              </LegalParagraph>
              <LegalParagraph lead>
                That guarantee is specific, and it is important you know exactly how far it reaches. There are three pipelines, and only one of them is zero-knowledge:
              </LegalParagraph>
              <LegalList>
                <li>
                  <strong className="text-foreground">Website file uploads are zero-knowledge.</strong> Your browser encrypts the file before it leaves your device and the key never reaches me. I cannot read these files.
                </li>
                <li>
                  <strong className="text-foreground">CDN assets are not encrypted.</strong> They are public by design, because a browser has to be able to display them. I strip EXIF, GPS and camera metadata on upload, but the file itself is stored and served in the clear and is readable by me and by anyone holding the link.
                </li>
                <li>
                  <strong className="text-foreground">Developer API uploads are not encrypted.</strong> The API has no browser in the loop to hold a key, so files sent to it are stored as received and are readable by me. If you are using a third-party application built on my API, your uploads are held inside that developer&apos;s account, and both that developer and I can access them. Your privacy relationship in that case is with the developer, and you should consult their privacy policy.
                </li>
              </LegalList>
              <LegalParagraph>
                Unlike traditional cloud storage providers that decrypt your data on their backend, analyze it, and potentially share it with third parties, Hypastack relies exclusively on client-side encryption for its Secure File Sharing pipeline. All files uploaded through this pipeline are encrypted locally on your device using AES-GCM (256-bit) before transmission. My Permanent CDN Hosting pipeline is designed for public assets and is intentionally unencrypted, as detailed below.
              </LegalParagraph>
              <LegalParagraph>
                The encryption key (found in the URL fragment <code className="text-primary font-medium">#...</code>) is processed only by your local browser environment. Because web browsers are architecturally designed to never transmit the URL fragment to the server during a request, it is mathematically impossible for my infrastructure to intercept, record, or utilize your decryption keys. I have no &quot;master key&quot;, no backdoor, and no ability to decrypt your files.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="2. Information I Collect">
              <LegalParagraph>
                Because of the cryptographic design, the amount of data I can collect is fundamentally limited. What I do collect is strictly necessary for operating the account system, billing, and abuse prevention, and I am not going to pretend none of it is personal data. Some of it is, under GDPR, and I would rather say so plainly than have you find out from the code.
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Encrypted Ciphertext & Public Assets:</strong> For Secure File Sharing, I store the raw encrypted binary data. This data is entirely opaque to me. For Permanent CDN Hosting, I store the unencrypted assets as they are intended for public distribution via direct links.</li>
                <li><strong className="text-foreground">Metadata:</strong> I collect metadata necessary for routing and storage, including the total size of the file, expiration timestamps, and cryptographic parameters required by your browser to reassemble encrypted files. For encrypted shares, filenames and custom notes are also encrypted using a distinct server-side key wrapper to prevent passive metadata leakage.</li>
                <li><strong className="text-foreground">Account Identifiers:</strong> Every account gets a randomly generated account ID and a passkey, a long, randomly generated secret rather than a chosen password, which I store as a one-way hash and never see again in a readable form. Your nickname is encrypted in your browser before it reaches me. I do not collect an email address, phone number, or any other identity document. That said, the account ID itself is a personal identifier under GDPR: it can be used to single out and track one account&apos;s activity over time, even without knowing who that person is in the real world, so I am counting it as personal data below.</li>
                <li><strong className="text-foreground">Optional Profile Data:</strong> If you set an avatar, banner, or display name, that is stored as you provided it. None of it is required to use Hypastack.</li>
                <li><strong className="text-foreground">Session and API Key Data:</strong> Signing in creates a session, I store a one-way hash of the session&apos;s refresh token, never the token itself. Developer API keys work the same way: I store a one-way hash and a short hint, never the full key, which is shown to you once at creation.</li>
                <li><strong className="text-foreground">Bandwidth Telemetry:</strong> I monitor aggregated egress traffic at the edge node level to prevent DDoS attacks and enforce service limits. This data is anonymized and cannot be traced back to individual unencrypted file contents.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="3. IP Addresses and Rate Limiting">
              <LegalParagraph>
                On sensitive endpoints, login, registration, downloads, the Bin, and forum posts, I hash your IP address with HMAC-SHA256 and a server-side secret before it is used for anything. That hash is one-way, I cannot reverse it back into your IP address, but it is deterministic: the same IP always produces the same hash. That is what makes it useful for rate limiting, and it is also why, under GDPR, it still counts as personal data. This is called pseudonymisation, not anonymisation, because the hash can still be used to link activity to one visitor over time. I am not going to claim otherwise.
              </LegalParagraph>
              <LegalParagraph>
                The hash is normally held only in memory (Redis) for the length of the relevant rate-limit window, typically a few minutes, and expires automatically. If Redis is briefly unavailable, the same hash falls back to a small table in my Postgres database with the same short retention, rows past their window are deleted automatically, not kept indefinitely.
              </LegalParagraph>
              <LegalParagraph>
                This hash is never linked to your account, nickname, or files, and I do not use it for tracking, profiling, or analytics. Its only purpose is stopping abuse: brute-force login attempts, mass account creation, and spam. My lawful basis for this processing is legitimate interest under GDPR Article 6(1)(f), keeping the service usable outweighs the minimal privacy impact of a short-lived, non-reversible hash.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="4. Information I Do Not Collect">
              <LegalParagraph>
                My architecture actively prevents me from collecting the following information:
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Decryption Keys:</strong> Never transmitted, never stored.</li>
                <li><strong className="text-foreground">Plaintext Passkeys:</strong> I do not store or transmit your passkey in plaintext at any point.</li>
                <li><strong className="text-foreground">Unencrypted Private File Contents:</strong> For files uploaded via the Secure File Sharing pipeline, the unencrypted content is never transmitted to my servers. I cannot scan for keywords, viruses, or copyrighted material using traditional deep-packet or at-rest inspection tools on these encrypted files.</li>
                <li><strong className="text-foreground">Email Addresses and Real Identities:</strong> There is no email, phone number, or ID verification anywhere in the account system.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="5. Your Rights Under GDPR">
              <LegalParagraph>
                If you are in the EU or UK, or the GDPR otherwise applies to you, you have the following rights over the personal data described above (your account ID, encrypted nickname, optional profile data, and hashed IP):
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Access:</strong> You can ask what account metadata I hold about you.</li>
                <li><strong className="text-foreground">Rectification:</strong> You can correct inaccurate profile data through your account settings, or by asking me directly.</li>
                <li><strong className="text-foreground">Erasure:</strong> You can delete your account and its associated metadata at any time from your account settings. This is irreversible.</li>
                <li><strong className="text-foreground">Restriction and Objection:</strong> You can object to processing that relies on legitimate interest, including the rate-limiting hash described above, though this may affect my ability to protect your account from abuse.</li>
                <li><strong className="text-foreground">Portability:</strong> You can request an export of the account metadata I hold, in a structured format.</li>
              </LegalList>
              <LegalParagraph>
                To exercise any of these, reach out via <strong className="text-foreground"><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong>, or see the fuller request process on my <a href="/coppa-gdpr" className="underline hover:opacity-70 transition-opacity">COPPA & GDPR page</a>. I am a solo developer, not a company with a dedicated privacy team, so treat response times accordingly, I will get to it, but I do not have a formally designated Data Protection Officer at this time.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="6. Third-Party Sharing">
              <LegalParagraph>
                I do not sell, rent, or trade your personal information or metadata. I only share operational telemetry with infrastructure partners (such as Cloudflare R2 for edge delivery) strictly for the purpose of transmitting your encrypted data. These partners are legally and technically constrained from accessing the unencrypted contents of your files, as they too lack the decryption keys.
              </LegalParagraph>
              <LegalParagraph>
                In the event of a valid, legally binding subpoena or court order, I will comply with law enforcement. For files uploaded through the website, I can only provide the encrypted ciphertext blocks and basic account metadata, never the decryption keys or unencrypted contents, since I do not possess them. For CDN assets and developer API uploads, which are unencrypted, I can provide the content itself.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="7. Data Retention and Deletion">
              <LegalParagraph>
                When a file reaches its user-defined expiration date, or if a &quot;Burn on Read&quot; condition is triggered, the cryptographic keys associated with the edge routing are immediately invalidated, and an asynchronous deletion job is dispatched to permanently purge the ciphertext from my CDN storage buckets.
              </LegalParagraph>
              <LegalParagraph>
                This deletion is irreversible. I do not keep &quot;soft deletes&quot; or hidden backups of user-uploaded files. Once a file is purged, it is gone from the Hypastack network. Accounts inactive past their configured purge window are deleted automatically, along with their metadata.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="8. Security and Breaches">
              <LegalParagraph>
                In the unlikely event of a breach of my infrastructure, the structural integrity of your file privacy remains intact where it matters most. Because website files are encrypted client-side, any ciphertext exfiltrated by an attacker would be unreadable without the key, which I never had. Account metadata (account ID, encrypted nickname, hashed passkey, hashed rate-limit data) could be exposed in a breach, and I am not going to claim otherwise.
              </LegalParagraph>
              <LegalParagraph>
                If a breach is likely to pose a risk to your rights, I will notify the relevant supervisory authority within 72 hours as required by GDPR Article 33, and notify affected users directly where required by Article 34.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
