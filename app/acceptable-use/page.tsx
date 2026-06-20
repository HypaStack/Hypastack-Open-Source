import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "Guidelines for responsible use of Hypastack's encrypted file sharing and CDN services.",
}

export default function AcceptableUse() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold tracking-tight text-[#f7f8f8] mb-8 leading-[1.05] -ml-0.5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
            Acceptable Use Policy
          </h1>
          
          <div className="text-sm text-[#898e97] mb-12 border-b border-white/5 pb-6">
            <p>Effective Date: June 14, 2026</p>
            <p>Last Updated: June 14, 2026</p>
          </div>
          
          <div className="space-y-16 text-[15px] leading-relaxed text-[#898e97]">
            <section>
              <p className="mb-4 text-[#f7f8f8] font-medium">
                Hypastack is a zero-knowledge file sharing and CDN hosting platform designed to provide mathematical privacy to its users. However, privacy does not equate to lawlessness. 
              </p>
              <p>
                This Acceptable Use Policy defines strictly what is not allowed on my infrastructure. If you violate this policy, your account, associated access keys, and all uploaded ciphertext will be terminated and permanently purged without warning. By utilizing my network, you explicitly agree to adhere to these constraints.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>1. Zero-Tolerance Content (Strict Prohibition)</h2>
              <p className="mb-4">
                You must under no circumstances upload, distribute, or facilitate access to the following categories of content. Violation of this section will result in immediate network bans and cooperation with relevant global law enforcement agencies:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-[#f7f8f8]">Child Sexual Abuse Material (CSAM):</strong> Any material depicting or promoting the abuse or sexual exploitation of minors. All instances are reported immediately to the National Center for Missing & Exploited Children (NCMEC) and relevant authorities.</li>
                <li><strong className="text-[#f7f8f8]">Terrorism and Violent Extremism:</strong> Content that promotes, encourages, or provides instructional material for terrorist acts or mass violence.</li>
                <li><strong className="text-[#f7f8f8]">Non-Consensual Intimate Imagery (NCII):</strong> Often referred to as "revenge porn", distributing intimate media without the explicit consent of the subjects involved is strictly forbidden.</li>
                <li><strong className="text-[#f7f8f8]">Malicious Payloads:</strong> Malware, ransomware, trojans, worms, or any code expressly designed to disrupt, damage, or gain unauthorized access to computer systems.</li>
                <li><strong className="text-[#f7f8f8]">Phishing and Fraud:</strong> Hosting phishing pages, credential-harvesting kits, or materials designed to defraud individuals or organizations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>2. Network Abuse and Operational Constraints</h2>
              <p className="mb-4">
                The Hypastack CDN is designed for the rapid delivery of legitimate assets. To maintain high availability for all users, you must not engage in activities that degrade the network:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-[#f7f8f8]">Evasion of Quotas:</strong> Attempting to bypass rate limits, storage quotas, bandwidth caps, or file-size restrictions through automated scripts or rapid account rotation.</li>
                <li><strong className="text-[#f7f8f8]">Infrastructure Probing:</strong> Scanning, testing, or probing the vulnerability of any Hypastack edge node, API endpoint, or database without prior explicit, written authorization.</li>
                <li><strong className="text-[#f7f8f8]">Primary Hosting Abuse:</strong> Utilizing the CDN endpoints to host an entire website's primary HTML structure (the platform is strictly for distributing static assets and media, not operating as a web server replacement).</li>
                <li><strong className="text-[#f7f8f8]">Distributed Denial of Service (DDoS):</strong> Leveraging the platform to artificially inflate traffic or attack third-party networks.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>3. Enforcement Under Zero-Knowledge</h2>
              <p className="mb-4">
                Because Hypastack employs client-side AES-GCM encryption, I am mathematically incapable of proactively scanning the unencrypted contents of the files uploaded to my servers. I cannot implement traditional hash-matching or keyword-scanning algorithms on ciphertext.
              </p>
              <p>
                Consequently, my enforcement mechanisms rely on:
              </p>
              <ul className="list-disc list-inside space-y-3 ml-2">
                <li><strong className="text-[#f7f8f8]">User Reports:</strong> I actively process abuse reports sent via <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong>. A valid report should include the URL of the file. Please do not include the decryption key fragment.</li>
                <li><strong className="text-[#f7f8f8]">Traffic Analysis:</strong> I monitor anomalous traffic patterns, bandwidth spikes, and request origins to detect automated abuse or malware distribution networks.</li>
                <li><strong className="text-[#f7f8f8]">Metadata Heuristics:</strong> I utilize unencrypted metadata (file size ratios, upload patterns) to identify coordinated abuse campaigns.</li>
              </ul>
              <p className="mt-4">
                When a valid violation is confirmed, the offending ciphertext is permanently deleted from the R2 edge storage, and the associated uploader's session or account may be terminated.
              </p>
              <p className="mt-4">
                <strong className="text-[#f7f8f8]">CDN Assets are different.</strong> Files uploaded through the Permanent CDN Hosting pipeline are not encrypted, and they are publicly accessible by design. This means CDN assets are not subject to the zero-knowledge constraint above. I plan to introduce client-side scanning for CDN uploads in a future update, which will flag prohibited content before it is ever transmitted to my servers. Until that is in place, CDN asset uploads remain subject to the same user-report and traffic-analysis mechanisms above, and prohibited content will be removed upon discovery.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>4. Reporting Abuse</h2>
              <p className="mb-4">
                If you encounter content hosted on Hypastack that violates this policy, send a report to <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong> with the file link and a brief description of the violation.
              </p>
              <p className="mb-4">
                <strong className="text-[#f7f8f8]">Do not include the decryption key fragment.</strong> I will not ask for it, and you should not send it. Receiving the key would require me to actively decrypt and view potentially illegal content, including CSAM, which creates direct legal liability for me under laws governing possession and viewing of such material. I am not equipped or willing to act as a human review queue for illegal content.
              </p>
              <p className="mb-4">
                Instead, include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>The URL of the file (without the <code className="text-[#f7f8f8] font-medium">#key=...</code> fragment)</li>
                <li>A screenshot, description, or any other contextual proof that does not require me to decrypt the content</li>
                <li>The nature of the violation (e.g. CSAM, malware, phishing)</li>
              </ul>
              <p className="mt-4">
                For CSAM specifically: <strong className="text-[#f7f8f8]">do not screenshot or preserve the content.</strong> Report the URL directly to the <a href="https://www.missingkids.org/gethelpnow/cybertipline" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">NCMEC CyberTipline</a> and send me the file URL so I can remove it immediately. That is all I need.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
