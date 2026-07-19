import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "Hypastack's process for handling copyright takedown requests under the Digital Millennium Copyright Act.",
}

export default function DmcaPolicy() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-20">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <h1 className="text-[clamp(28px,4.5vw,56px)] font-bold tracking-tight text-[#f7f8f8] mb-8 leading-[1.05] -ml-0.5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
            DMCA Policy
          </h1>
          
          <div className="text-sm text-[#898e97] mb-8">
            <p>Effective: May 7, 2026</p>
          </div>
          
          <div className="space-y-8 text-[#898e97]">
            <p className="text-[#f7f8f8]">
              Hypastack respects copyright. If you believe content hosted on my platform 
              infringes your copyright, you can submit a takedown request.
            </p>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>How to File a Takedown</h2>
              <p className="mb-4">
                Send a message via <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong> with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The URL of the infringing content on Hypastack</li>
                <li>A description of the copyrighted work being infringed</li>
                <li>Your contact information</li>
                <li>A statement that you have a good-faith belief the use is not authorized</li>
                <li>A statement under penalty of perjury that the information is accurate and you are the copyright owner or authorized to act on their behalf</li>
                <li>Your physical or electronic signature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>What I Do</h2>
              <p className="mb-4">
                When I receive a valid DMCA notice, I remove the content. I cannot reliably notify
                the uploader — I do not have their email address or any contact information, whether
                the file was encrypted or not.
              </p>
              <p className="mb-4">
                If the content was shared via a temporary link, it may have already expired 
                and been automatically deleted before I process the request.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Counter-Notification</h2>
              <p className="mb-4">
                If your content was removed and you believe it was not infringing, you may submit 
                a counter-notification via <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong> with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your contact information</li>
                <li>Identification of the removed content and its original URL</li>
                <li>A statement under penalty of perjury that you believe the content was removed by mistake</li>
                <li>Consent to jurisdiction of your local federal court</li>
                <li>Your physical or electronic signature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Repeat Infringers</h2>
              <p>
                I will terminate accounts of repeat infringers when I can identify them. Given
                my account model, identification is limited to the hashed nickname and
                associated file records.
              </p>
            </section>

            <section>
              <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-[#f7f8f8] mb-5" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Contact</h2>
              <p>
                Telegram: <strong><a href="https://t.me/t_usekiko" className="underline hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer">https://t.me/t_usekiko</a></strong>
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
