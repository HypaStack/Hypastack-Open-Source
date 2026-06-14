import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Hypastack",
  description: "Hypastack is a zero-knowledge encrypted file sharing platform and CDN built in Europe. Open source, no tracking, no accounts required.",
}

export default function About() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            What is Hypastack?
          </h1>
          
          <div className="space-y-10 text-[15px] leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Zero-Knowledge Architecture</h2>
              <p className="mb-4 text-foreground">
                Hypastack is a secure, high-performance file sharing and CDN platform built from the ground up to ensure absolute privacy for your files. I achieve this by utilizing a strictly zero-knowledge architecture.
              </p>
              <p className="mb-4">
                Unlike traditional cloud storage providers that encrypt your files on their servers—meaning they hold the keys and can read your data at any time—Hypastack shifts the encryption process entirely to your device.
              </p>
              <p>
                When you upload a file, it is encrypted directly inside your browser using AES-GCM (256-bit) encryption before a single byte ever leaves your device. The encryption key required to unlock the file is securely embedded into the URL fragment (the <code className="text-primary font-medium">#key=...</code> portion). Because URL fragments are processed strictly by the browser and are never transmitted across the network, my servers literally never see, receive, or store your decryption key.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Verifiable Security</h2>
              <p className="mb-4">
                Since I never receive your key, I am mathematically incapable of decrypting your files. I cannot scan them, I cannot read them, and I cannot hand them over to third parties. If you lose your URL, the file is permanently and unrecoverably locked forever. 
              </p>
              <p>
                This zero-knowledge guarantee ensures that your data remains yours. Even in the event of a catastrophic server breach, the files stored on my network are nothing but mathematically randomized ciphertext, completely useless to any attacker without the unique key generated on your device.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Secure File Sharing vs. Permanent CDN Hosting</h2>
              <p className="mb-4">
                Hypastack offers two distinct pipelines tailored for different privacy needs: <strong>Secure File Sharing</strong> and <strong>Permanent CDN Hosting</strong>.
              </p>
              <p className="mb-4">
                The <strong className="text-foreground">Secure File Sharing</strong> pipeline is strictly zero-knowledge. Files are encrypted client-side, and the resulting unreadable ciphertext is transferred across my network. This is ideal for sensitive documents, private media, and secure backups where confidentiality is paramount.
              </p>
              <p>
                The <strong className="text-foreground">Permanent CDN Hosting</strong> pipeline, on the other hand, is designed for the high-speed global delivery of public assets (such as images for websites or forums). Because these files must be publicly accessible via direct <code className="text-primary font-medium">r2.hypastack.com</code> links, they are not encrypted. Instead, to protect your privacy, these assets are actively "repainted" and re-encoded upon upload. This process completely strips all hidden EXIF data, GPS coordinates, and identifying metadata before the file is distributed to my edge network, ensuring that your public uploads cannot be traced back to your location or device.
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
