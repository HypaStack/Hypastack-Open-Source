import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Our Mission",
  description: "Why Hypastack exists — a private, source-available alternative to Dropbox and WeTransfer. No ads, no data collection, EU-based servers, and free to use.",
  alternates: {
    canonical: "https://hypastack.com/goal",
  },
}

export default function Goal() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            What's our goal?
          </h1>
          
          <div className="space-y-10 text-[15px] leading-relaxed text-muted-foreground">
            <section>
              <p className="mb-4 text-foreground text-lg font-medium leading-relaxed">
                Our goal is simple: to build a platform that guarantees absolute mathematical privacy for your data.
              </p>
              <p className="mb-4">
                We believe you shouldn't have to trust our servers, our administrators, or any third party to keep your files secure. In modern tech, trusting a company not to look at your data is a vulnerability. Instead of asking for your trust with promises or privacy policies, we eliminated our ability to access your data entirely through cryptography.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Eliminating the Middleman</h2>
              <p className="mb-4">
                For too long, transferring files securely meant relying on a middleman who promised not to peek. We want to normalize the idea that file sharing should be secure by default, invisible to the host, and mathematically unbreakable by anyone who doesn't have the explicit URL.
              </p>
              <p>
                By enforcing strictly client-side AES-GCM encryption, we ensure that you—and you alone—hold the keys to your data. The server is reduced to a "dumb pipe" that merely holds and transfers encrypted blobs of bytes, completely blind to the actual content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">A Future of Secure Infrastructure</h2>
              <p className="mb-4">
                Ultimately, we are striving to build infrastructure that respects user autonomy. A world where data breaches yield nothing but scrambled noise, and where the user maintains total cryptographic sovereignty over their digital assets.
              </p>
              <p>
                Whether you are sharing sensitive intellectual property, personal memories, or critical business documents, Hypastack's goal is to provide a seamless, blazing-fast network that mathematically guarantees your right to privacy.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
