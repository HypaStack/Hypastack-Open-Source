import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph, LegalList } from "@/components/legal-document"

const description = "Guidelines for responsible use of Hypastack's file sharing and CDN services."

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description,
  alternates: {
    canonical: "https://hypastack.com/acceptable-use",
  },
  openGraph: {
    title: "Acceptable Use Policy (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/acceptable-use",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceptable Use Policy (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function AcceptableUse() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument
            title="Acceptable Use Policy"
            dates={[
              { label: "Effective Date", value: "June 14, 2026" },
              { label: "Last Updated", value: "June 14, 2026" },
            ]}
            intro="Hypastack is a file sharing and CDN hosting platform. Files uploaded through the website are protected by a zero-knowledge architecture; CDN assets and developer API uploads are not encrypted and are readable by me. However, privacy does not equate to lawlessness."
          >
            <LegalParagraph>
              This Acceptable Use Policy defines strictly what is not allowed on my infrastructure. If you violate this policy, your account, associated access keys, and all uploaded ciphertext will be terminated and permanently purged without warning. By utilizing my network, you explicitly agree to adhere to these constraints.
            </LegalParagraph>

            <LegalSection title="1. Zero-Tolerance Content (Strict Prohibition)">
              <LegalParagraph>
                You must under no circumstances upload, distribute, or facilitate access to the following categories of content. Violation of this section will result in immediate network bans and cooperation with relevant global law enforcement agencies:
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Child Sexual Abuse Material (CSAM):</strong> Any material depicting or promoting the abuse or sexual exploitation of minors. All instances are reported immediately to the National Center for Missing &amp; Exploited Children (NCMEC) and relevant authorities.</li>
                <li><strong className="text-foreground">Terrorism and Violent Extremism:</strong> Content that promotes, encourages, or provides instructional material for terrorist acts or mass violence.</li>
                <li><strong className="text-foreground">Non-Consensual Intimate Imagery (NCII):</strong> Often referred to as &quot;revenge porn&quot;, distributing intimate media without the explicit consent of the subjects involved is strictly forbidden.</li>
                <li><strong className="text-foreground">Malicious Payloads:</strong> Malware, ransomware, trojans, worms, or any code expressly designed to disrupt, damage, or gain unauthorized access to computer systems.</li>
                <li><strong className="text-foreground">Phishing and Fraud:</strong> Hosting phishing pages, credential-harvesting kits, or materials designed to defraud individuals or organizations.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="2. Network Abuse and Operational Constraints">
              <LegalParagraph>
                The Hypastack CDN is designed for the rapid delivery of legitimate assets. To maintain high availability for all users, you must not engage in activities that degrade the network:
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">Evasion of Quotas:</strong> Attempting to bypass rate limits, storage quotas, bandwidth caps, or file-size restrictions through automated scripts or rapid account rotation.</li>
                <li><strong className="text-foreground">Infrastructure Probing:</strong> Scanning, testing, or probing the vulnerability of any Hypastack edge node, API endpoint, or database without prior explicit, written authorization.</li>
                <li><strong className="text-foreground">Primary Hosting Abuse:</strong> Utilizing the CDN endpoints to host an entire website&apos;s primary HTML structure (the platform is strictly for distributing static assets and media, not operating as a web server replacement).</li>
                <li><strong className="text-foreground">Distributed Denial of Service (DDoS):</strong> Leveraging the platform to artificially inflate traffic or attack third-party networks.</li>
              </LegalList>
            </LegalSection>

            <LegalSection title="3. Enforcement Under Zero-Knowledge">
              <LegalParagraph>
                Because Hypastack employs client-side AES-GCM encryption for website uploads, I am mathematically incapable of proactively scanning the contents of those files. I cannot implement traditional hash-matching or keyword-scanning algorithms on ciphertext. This constraint applies to that pipeline alone: CDN assets and developer API uploads are stored unencrypted, and I am technically able to inspect them when I have cause to.
              </LegalParagraph>
              <LegalParagraph>
                Consequently, my enforcement mechanisms rely on:
              </LegalParagraph>
              <LegalList>
                <li><strong className="text-foreground">User Reports:</strong> I actively process abuse reports sent via <strong className="text-foreground"><a href="mailto:usekiko@hypamail.me" className="underline hover:opacity-70 transition-opacity">usekiko@hypamail.me</a></strong>. A valid report should include the URL of the file. Please do not include the decryption key fragment.</li>
                <li><strong className="text-foreground">Traffic Analysis:</strong> I monitor anomalous traffic patterns, bandwidth spikes, and request origins to detect automated abuse or malware distribution networks.</li>
                <li><strong className="text-foreground">Metadata Heuristics:</strong> I utilize unencrypted metadata (file size ratios, upload patterns) to identify coordinated abuse campaigns.</li>
              </LegalList>
              <LegalParagraph>
                When a valid violation is confirmed, the offending ciphertext is permanently deleted from the R2 edge storage, and the associated uploader&apos;s session or account may be terminated.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">CDN Assets are different.</strong> Files uploaded through the Permanent CDN Hosting pipeline are not encrypted, and they are publicly accessible by design. This means CDN assets are not subject to the zero-knowledge constraint above. I plan to introduce client-side scanning for CDN uploads in a future update, which will flag prohibited content before it is ever transmitted to my servers. Until that is in place, CDN asset uploads remain subject to the same user-report and traffic-analysis mechanisms above, and prohibited content will be removed upon discovery.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="4. Reporting Abuse">
              <LegalParagraph>
                If you encounter content hosted on Hypastack that violates this policy, send a report to <strong className="text-foreground"><a href="mailto:usekiko@hypamail.me" className="underline hover:opacity-70 transition-opacity">usekiko@hypamail.me</a></strong> with the file link and a brief description of the violation.
              </LegalParagraph>
              <LegalParagraph>
                <strong className="text-foreground">Do not include the decryption key fragment.</strong> I will not ask for it, and you should not send it. Receiving the key would require me to actively decrypt and view potentially illegal content, including CSAM, which creates direct legal liability for me under laws governing possession and viewing of such material. I am not equipped or willing to act as a human review queue for illegal content.
              </LegalParagraph>
              <LegalParagraph>
                Instead, include:
              </LegalParagraph>
              <LegalList>
                <li>The URL of the file (without the <code className="text-primary font-medium">#...</code> fragment)</li>
                <li>A screenshot, description, or any other contextual proof that does not require me to decrypt the content</li>
                <li>The nature of the violation (e.g. CSAM, malware, phishing)</li>
              </LegalList>
              <LegalParagraph>
                For CSAM specifically: <strong className="text-foreground">do not screenshot or preserve the content.</strong> Report the URL directly to the <a href="https://www.missingkids.org/gethelpnow/cybertipline" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">NCMEC CyberTipline</a> and send me the file URL so I can remove it immediately. That is all I need.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
