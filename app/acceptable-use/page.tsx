import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Acceptable Use Policy - Hypastack",
  description: "What you can and cannot do on Hypastack.",
}

export default function AcceptableUse() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Acceptable Use Policy
          </h1>
          
          <div className="text-sm text-muted-foreground mb-12 border-b border-white/5 pb-6">
            <p>Effective Date: May 7, 2026</p>
            <p>Last Updated: May 25, 2026</p>
          </div>
          
          <div className="space-y-12 text-[15px] leading-relaxed text-muted-foreground">
            <section>
              <p className="mb-4 text-foreground font-medium">
                Hypastack is a zero-knowledge file sharing and CDN hosting platform designed to provide mathematical privacy to its users. However, privacy does not equate to lawlessness. 
              </p>
              <p>
                This Acceptable Use Policy defines strictly what is not allowed on our infrastructure. If you violate this policy, your account, associated access keys, and all uploaded ciphertext will be terminated and permanently purged without warning. By utilizing our network, you explicitly agree to adhere to these constraints.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">1. Zero-Tolerance Content (Strict Prohibition)</h2>
              <p className="mb-4">
                You must under no circumstances upload, distribute, or facilitate access to the following categories of content. Violation of this section will result in immediate network bans and cooperation with relevant global law enforcement agencies:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">Child Sexual Abuse Material (CSAM):</strong> Any material depicting or promoting the abuse or sexual exploitation of minors. All instances are reported immediately to the National Center for Missing & Exploited Children (NCMEC) and relevant authorities.</li>
                <li><strong className="text-foreground">Terrorism and Violent Extremism:</strong> Content that promotes, encourages, or provides instructional material for terrorist acts or mass violence.</li>
                <li><strong className="text-foreground">Non-Consensual Intimate Imagery (NCII):</strong> Often referred to as "revenge porn," distributing intimate media without the explicit consent of the subjects involved is strictly forbidden.</li>
                <li><strong className="text-foreground">Malicious Payloads:</strong> Malware, ransomware, trojans, worms, or any code expressly designed to disrupt, damage, or gain unauthorized access to computer systems.</li>
                <li><strong className="text-foreground">Phishing and Fraud:</strong> Hosting phishing pages, credential-harvesting kits, or materials designed to defraud individuals or organizations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">2. Network Abuse and Operational Constraints</h2>
              <p className="mb-4">
                The Hypastack CDN is designed for the rapid delivery of legitimate assets. To maintain high availability for all users, you must not engage in activities that degrade the network:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">Evasion of Quotas:</strong> Attempting to bypass rate limits, storage quotas, bandwidth caps, or file-size restrictions through automated scripts or rapid account rotation.</li>
                <li><strong className="text-foreground">Infrastructure Probing:</strong> Scanning, testing, or probing the vulnerability of any Hypastack edge node, API endpoint, or database without prior explicit, written authorization.</li>
                <li><strong className="text-foreground">Primary Hosting Abuse:</strong> Utilizing the CDN endpoints to host an entire website's primary HTML structure (the platform is strictly for distributing static assets and media, not operating as a web server replacement).</li>
                <li><strong className="text-foreground">Distributed Denial of Service (DDoS):</strong> Leveraging the platform to artificially inflate traffic or attack third-party networks.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">3. Enforcement Under Zero-Knowledge</h2>
              <p className="mb-4">
                Because Hypastack employs client-side AES-GCM encryption, we are mathematically incapable of proactively scanning the unencrypted contents of the files uploaded to our servers. We cannot implement traditional hash-matching or keyword-scanning algorithms on ciphertext.
              </p>
              <p>
                Consequently, our enforcement mechanisms rely on:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-foreground">User Reports:</strong> We actively process abuse reports sent to <strong>abuse@hypastack.com</strong>. A valid report must include the complete URL (including the decryption key fragment) so that our abuse team can verify the violation in a localized environment.</li>
                <li><strong className="text-foreground">Traffic Analysis:</strong> We monitor anomalous traffic patterns, bandwidth spikes, and request origins to detect automated abuse or malware distribution networks.</li>
                <li><strong className="text-foreground">Metadata Heuristics:</strong> We utilize unencrypted metadata (file size ratios, upload patterns) to identify coordinated abuse campaigns.</li>
              </ul>
              <p className="mt-4">
                When a valid violation is confirmed, the offending ciphertext is permanently deleted from the R2 edge storage, and the associated uploader's session or account may be terminated.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-5">4. Reporting Abuse</h2>
              <p>
                If you encounter content hosted on Hypastack that violates this policy, immediately forward the full URL (including the <code className="text-primary font-medium">#key=...</code> fragment) and a brief description of the violation to <strong>abuse@hypastack.com</strong>. Reports missing the key fragment cannot be verified due to our encryption architecture and may be dismissed.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
