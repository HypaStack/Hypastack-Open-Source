import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import { PREVIEW_URL } from "@/constants"
import { LegalDocument, LegalSection, LegalParagraph } from "@/components/legal-document"

const description = "Hypastack is a private, source-available file sharing platform and CDN built in Europe. No tracking, no personal data collected, and free to use."

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: {
    canonical: "https://hypastack.com/about",
  },
  openGraph: {
    title: "About (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/about",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "About (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function About() {
  return (
    <main className="flex min-h-screen flex-col bg-black">
      <Navbar />

      <section className="flex-1 pt-32 pb-40 px-6">
        <div className="mx-auto max-w-[880px]">
          <LegalDocument title="What is Hypastack?" dates={[]}>
            <LegalSection title="Zero-Knowledge Architecture">
              <LegalParagraph lead>
                Hypastack is a secure, high-performance file sharing and CDN platform built from the ground up to ensure absolute privacy for the files you share through this website. I achieve this by utilizing a strictly zero-knowledge architecture for that pipeline. Two other pipelines are deliberately not encrypted, and I would rather say so plainly than let you assume otherwise: CDN assets are public by design and have only their metadata stripped, and uploads made through the developer API are stored as received and are readable by me.
              </LegalParagraph>
              <LegalParagraph>
                Unlike traditional cloud storage providers, which encrypt your files on their servers (meaning they hold the keys and can read your data at any time), Hypastack shifts the encryption process entirely to your device.
              </LegalParagraph>
              <LegalParagraph>
                When you upload a file, it is encrypted directly inside your browser using AES-GCM (256-bit) encryption before a single byte ever leaves your device. The encryption key required to unlock the file is securely embedded into the URL fragment (the <code className="text-primary font-medium">#key=...</code> portion). Because URL fragments are processed strictly by the browser and are never transmitted across the network, my servers literally never see, receive, or store your decryption key.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Verifiable Security">
              <LegalParagraph>
                Since I never receive your key, I am mathematically incapable of decrypting your files. I cannot scan them, I cannot read them, and I cannot hand them over to third parties. If you lose your URL, the file is permanently and unrecoverably locked forever.
              </LegalParagraph>
              <LegalParagraph>
                This zero-knowledge guarantee ensures that your data remains yours. Even in the event of a catastrophic server breach, the files stored on my network are nothing but mathematically randomized ciphertext, completely useless to any attacker without the unique key generated on your device.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Secure File Sharing vs. Permanent CDN Hosting">
              <LegalParagraph>
                Hypastack offers two distinct pipelines tailored for different privacy needs: <strong className="text-foreground">Secure File Sharing</strong> and <strong className="text-foreground">Permanent CDN Hosting</strong>.
              </LegalParagraph>
              <LegalParagraph>
                The <strong className="text-foreground">Secure File Sharing</strong> pipeline is strictly zero-knowledge. Files are encrypted client-side, and the resulting unreadable ciphertext is transferred across my network. This is ideal for sensitive documents, private media, and secure backups where confidentiality is paramount.
              </LegalParagraph>
              <LegalParagraph>
                The <strong className="text-foreground">Permanent CDN Hosting</strong> pipeline, on the other hand, is designed for the high-speed global delivery of public assets (such as images for websites or forums). Because these files must be publicly accessible via direct <code className="text-primary font-medium">r2.hypastack.com</code> links, they are not encrypted. Instead, to protect your privacy, these assets are actively &quot;repainted&quot; and re-encoded upon upload. This process completely strips all hidden EXIF data, GPS coordinates, and identifying metadata before the file is distributed to my edge network, ensuring that your public uploads cannot be traced back to your location or device.
              </LegalParagraph>
            </LegalSection>
          </LegalDocument>
        </div>
      </section>

      <Footer />
    </main>
  )
}
