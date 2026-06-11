"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"

export default function InsiderProgramPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.is_insider !== 1) {
        router.push("/")
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.is_insider !== 1) {
    return null
  }

  return (
    <main className="theme-marketing relative min-h-screen bg-[#111111] text-foreground w-full overflow-x-hidden">
      <Navbar />
      
      <div className="pt-32 pb-20 px-6 sm:px-12 max-w-6xl mx-auto min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eab308]/10 text-[#eab308] text-[12px] font-bold uppercase tracking-widest mb-6">
            <MIcon name="science" size={16} />
            Insider Access Granted
          </div>
          <h1 className="text-[42px] sm:text-[64px] font-semibold text-white tracking-tight leading-tight mb-6" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
            Welcome to the <br className="hidden sm:block" /> Insider Program
          </h1>
          <p className="text-[17px] text-[#a1a1aa] max-w-2xl mx-auto leading-relaxed">
            As an Insider, you get exclusive access to experimental features, beta builds, and a direct line to our engineering team. Thank you for helping shape the future of Hypastack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             style={{ borderRadius: 6, backgroundColor: '#171717', padding: 24, display: 'flex', flexDirection: 'column' }}
           >
             <MIcon name="bug_report" size={24} className="text-[#a1a1aa] mb-4" />
             <h3 className="text-[18px] font-semibold text-white mb-2">Early Access Builds</h3>
             <p className="text-[14px] text-[#888] leading-relaxed">Test upcoming features before they hit production. Expect some bugs, but enjoy the cutting edge.</p>
           </motion.div>
           
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             style={{ borderRadius: 6, backgroundColor: '#171717', padding: 24, display: 'flex', flexDirection: 'column' }}
           >
             <MIcon name="forum" size={24} className="text-[#a1a1aa] mb-4" />
             <h3 className="text-[18px] font-semibold text-white mb-2">Private Discord</h3>
             <p className="text-[14px] text-[#888] leading-relaxed">Join our private channel to chat directly with developers and other insiders.</p>
           </motion.div>
           
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             style={{ borderRadius: 6, backgroundColor: '#171717', padding: 24, display: 'flex', flexDirection: 'column' }}
           >
             <MIcon name="card_giftcard" size={24} className="text-[#a1a1aa] mb-4" />
             <h3 className="text-[18px] font-semibold text-white mb-2">Exclusive Perks</h3>
             <p className="text-[14px] text-[#888] leading-relaxed">Get increased storage limits and special profile badges for your contribution.</p>
           </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <a href="/manage/canary" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors">
            Enter Canary Dashboard <MIcon name="arrow_forward" size={18} />
          </a>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
