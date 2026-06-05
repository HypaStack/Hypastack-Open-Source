import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "Hypastack's process for handling copyright takedown requests under the Digital Millennium Copyright Act.",
}

export default function DmcaPolicy() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-20">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            DMCA Policy
          </h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            <p>Effective: May 7, 2026</p>
          </div>
          
          <div className="space-y-8 text-muted-foreground">
            <p className="text-foreground">
              Hypastack respects copyright. If you believe content hosted on our platform 
              infringes your copyright, you can submit a takedown request.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">How to File a Takedown</h2>
              <p className="mb-4">
                Send an email to <strong>dmca@hypastack.com</strong> with:
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
              <h2 className="text-xl font-semibold text-foreground mb-4">What We Do</h2>
              <p className="mb-4">
                When we receive a valid DMCA notice, we remove the content. Because of our 
                zero-knowledge architecture, we cannot reliably notify the uploader — we do not 
                have their email address or any contact information.
              </p>
              <p className="mb-4">
                If the content was shared via a temporary link, it may have already expired 
                and been automatically deleted before we process the request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Counter-Notification</h2>
              <p className="mb-4">
                If your content was removed and you believe it was not infringing, you may submit 
                a counter-notification to <strong>dmca@hypastack.com</strong> with:
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
              <h2 className="text-xl font-semibold text-foreground mb-4">Repeat Infringers</h2>
              <p>
                We will terminate accounts of repeat infringers when we can identify them. Given 
                our zero-knowledge model, identification is limited to the hashed nickname and 
                associated file records.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Contact</h2>
              <p>
                Email: <strong>dmca@hypastack.com</strong>
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
