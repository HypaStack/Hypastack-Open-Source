import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { MIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description: "Get early access to Hypastack. Anonymous sign-up, no email required.",
};

export default function WaitlistPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Navbar />
      
      <section className="relative min-h-[90vh] sm:min-h-screen flex items-center pt-20 pb-32">
        <div className="relative z-20 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-start text-left max-w-3xl">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-[14px] font-medium mb-10">
              <MIcon name="arrow_back" className="mr-2" size={16} /> Back to home
            </Link>

            <h1 className="text-[clamp(36px,5.5vw,56px)] leading-[1.1] tracking-[-0.03em] pb-2 pt-2 text-foreground font-bold" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              Contribute to Hypastack.
            </h1>
            
            <p className="mt-2 max-w-lg text-[16px] sm:text-[17px] leading-relaxed text-muted-foreground">
              Hypastack operates a strict zero-knowledge architecture. No emails, no personal data. Join the beta testing pool anonymously to help shape the platform.
            </p>

            <div className="mt-8 w-full max-w-lg">
              <form className="flex flex-col gap-5">
                <div>
                  <label htmlFor="nickname" className="block text-[13px] font-medium text-foreground mb-2 pl-1">Nickname / Alias (Optional)</label>
                  <input 
                    type="text" 
                    id="nickname"
                    placeholder="Anonymous"
                    className="w-full rounded-md bg-[#e8eaf0] border border-border px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow"
                  />
                </div>
                
                <div>
                  <label htmlFor="interest" className="block text-[13px] font-medium text-foreground mb-2 pl-1">Area of Interest</label>
                  <select 
                    id="interest"
                    className="w-full rounded-md bg-[#e8eaf0] border border-border px-4 py-3.5 text-[15px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow appearance-none"
                  >
                    <option value="general">General Platform Testing</option>
                    <option value="desktop">Native Desktop Client</option>
                    <option value="cli">Command Line Interface</option>
                    <option value="cdn">CDN Architecture</option>
                  </select>
                </div>
                
                <button
                  type="button"
                  className="relative mt-4 w-full rounded-md bg-foreground text-background px-4 py-3.5 text-[15px] font-semibold hover:opacity-90 transition-opacity"
                >
                  Generate Beta Token
                </button>
              </form>
              
              <p className="mt-6 text-[13px] text-muted-foreground leading-relaxed px-1">
                By generating a token, you will receive a cryptographic key that grants access to beta features once they become available.
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
