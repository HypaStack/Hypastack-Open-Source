"use client"
import { motion, AnimatePresence, LayoutGroup } from "motion/react"
import { usePathname } from "next/navigation"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <LayoutGroup id="page-transition">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          className="min-h-screen w-full flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  )
}
