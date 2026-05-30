import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { MIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "Desktop",
  description: "Experience the full power of Hypastack with our native desktop application for Windows.",
};

export default function DesktopAppPage() {
  return (
    <main className="theme-marketing relative min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Navbar />
      
      <section className="relative min-h-[90vh] sm:min-h-screen pt-20 pb-32 flex flex-col">
        <div className="relative z-20 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 mt-12 sm:mt-20">
          
          <div className="flex flex-col items-start text-left max-w-3xl">
            <Link href="/" className="inline-flex items-center text-[#7a7a80] hover:text-[#e5e5e5] transition-colors text-[14px] font-medium mb-10">
              <MIcon name="arrow_back" className="mr-2" size={16} /> Back to home
            </Link>

            <div className="mb-4 inline-flex items-center px-4 py-1.5 rounded-[16px] bg-[#171717] text-[13px] font-medium text-[#ccc]">
              Windows Client Available
            </div>
            
            <h1 className="text-[clamp(36px,5.5vw,56px)] leading-[1.1] tracking-[-0.03em] pb-2 pt-2 text-[#e5e5e5] font-bold" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              Native integration for power users.
            </h1>
            
            <p className="mt-2 max-w-lg text-[16px] sm:text-[17px] leading-relaxed text-[#aaa]">
              Built from the ground up using Rust and Tauri. The desktop client brings deep OS integration, background uploading, and an instant context menu directly to your file explorer.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="/api/v2/download/windows"
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-[16px] bg-[#e5e5e5] px-7 py-3.5 text-[15px] font-semibold text-[#0a0a0a] transition-colors hover:bg-white text-center"
              >
                Download for Windows
              </a>
              <Link
                href="/waitlist"
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-[16px] bg-[#171717] px-7 py-3.5 text-[15px] font-medium text-[#ccc] transition-colors hover:bg-[#1f1f1f] text-center"
              >
                Request macOS Alpha
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative bg-[#1f1f1f]/95 backdrop-blur-2xl p-8 rounded-[20px] glassy-border text-left shadow-xl">
              <h3 className="text-[18px] font-bold text-white mb-3">Context Menu Integration</h3>
              <p className="text-[15px] text-[#aaa] leading-relaxed">
                Right-click any file or directory in Windows Explorer to instantly encrypt and upload. A secure sharing link is automatically generated and copied to your clipboard.
              </p>
            </div>

            <div className="relative bg-[#1f1f1f]/95 backdrop-blur-2xl p-8 rounded-[20px] glassy-border-bright text-left shadow-xl">
              <h3 className="text-[18px] font-bold text-white mb-3">Background Uploads</h3>
              <p className="text-[15px] text-[#aaa] leading-relaxed">
                The application runs silently in the system tray. Large files process completely in the background, freeing up your browser and preventing interruptions.
              </p>
            </div>

            <div className="relative bg-[#1f1f1f]/95 backdrop-blur-2xl p-8 rounded-[20px] glassy-border-tl text-left shadow-xl">
              <h3 className="text-[18px] font-bold text-white mb-3">Bare-Metal Performance</h3>
              <p className="text-[15px] text-[#aaa] leading-relaxed">
                Constructed with Rust for a near-zero memory footprint. Client-side encryption utilizes native CPU instructions rather than relying on browser constraints.
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
