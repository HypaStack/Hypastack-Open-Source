import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Child Safety Policy",
  description: "Hypastack's commitment to child safety, including proactive CSAM detection and prevention measures.",
}

export default function ChildSafety() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-20">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold tracking-tight text-[#f7f8f8] mb-8 leading-[1.05] -ml-0.5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
            Child Safety Policy
          </h1>
          
          <div className="text-sm text-[#898e97] mb-8">
            <p>Effective: May 7, 2026</p>
          </div>
          
          <div className="space-y-8 text-[#898e97]">
            <p className="text-[#f7f8f8]">
              Hypastack has zero tolerance for child sexual abuse material (CSAM). 
              This is not negotiable.
            </p>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>My Position</h2>
              <p className="mb-4">
                Any content that sexually exploits or endangers children will be removed immediately 
                upon discovery or report. The associated account will be terminated. All available 
                information will be reported to NCMEC (National Center for Missing &amp; Exploited Children) 
                and relevant law enforcement.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>What I Can Provide to Authorities</h2>
              <p className="mb-4">
                For files uploaded through the website, my zero-knowledge architecture limits the data I can provide to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The hashed nickname associated with the account</li>
                <li>The encrypted nickname blob</li>
                <li>Account creation timestamp</li>
                <li>Last activity timestamp</li>
                <li>File metadata (encrypted filename, size, upload time)</li>
                <li>The file content itself (before deletion)</li>
              </ul>
              <p className="mt-4">
                CDN assets and files uploaded through the developer API are not encrypted. For those,
                I can provide the content itself in readable form, and I will do so when lawfully
                required.
              </p>
              <p className="mt-4">
                In no case do I have email addresses, IP addresses, or real identities. I am transparent
                about this limitation. It is a consequence of the account model and the zero-knowledge
                pipeline, not an attempt to shield abusers.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Prevention Measures</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Dangerous file types (executables, scripts) are strictly blocked for CDN uploads</li>
                <li>File type verification checks magic bytes, not just extensions</li>
                <li>Rate limits prevent mass-upload abuse</li>
                <li>CAPTCHA verification on uploads (Cloudflare Turnstile)</li>
                <li>Temporary files auto-expire within 1–7 days</li>
                <li>Inactive accounts are purged after 7 days</li>
              </ul>
              <p className="mt-4">
                For encrypted file shares, I cannot proactively scan contents — I rely on reports and the technical barriers above. CDN asset uploads are not encrypted and will be subject to client-side content scanning in a future update.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Age Requirements</h2>
              <p className="mb-4">
                Minimum age to use Hypastack: 18. 
                I cannot verify age because I do not collect identity information. 
                If I learn a user is underage, I delete the account.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Reporting</h2>
              <p className="mb-4">
                If you encounter CSAM or any content that endangers children, send the file URL (without any <code className="font-medium">#...</code> fragment) via <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong>. I will act within 24 hours.
              </p>
              <p className="mb-4">
                <strong className="text-[#f7f8f8]">Do not send me the decryption key.</strong> I will not ask for it. Receiving and decrypting content to verify a CSAM report creates direct legal liability for me. I do not and will not do this.
              </p>
              <p className="mb-4">
                <strong className="text-[#f7f8f8]">Do not screenshot or preserve CSAM.</strong> Simply send me the URL so I can delete the file immediately, and report it directly to the <a href="https://www.missingkids.org/gethelpnow/cybertipline" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">NCMEC CyberTipline</a>. That is all I need from you.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
