"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"

export function EmptyState({ query, username }: { query: string; username: string }) {
  const FACTS = [
    `what's your move ${username}`,
    "still empty here",
    "one solo dev not a whole growth team",
    "these links are public that's the whole point of cdn",
    "no tracking scripts phoning home",
    "exif and gps data get stripped on upload",
    "no ads no data broker no middleman",
    "served off the edge so it loads fast",
    "no email required to start sharing",
    "delete it and it's actually gone",
    "no exec tracking your engagement numbers",
    "keep the private stuff in drive this part's for sharing",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (query) return;
    
    setIndex(Math.floor(Math.random() * FACTS.length));
    
    const interval = setInterval(() => {
      setIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * FACTS.length);
        } while (next === prev);
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [query, FACTS.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-full max-w-md flex flex-col items-center">
        {query ? (
          <div className="inline-flex items-center justify-center mb-5 bg-[#f0f0f0] dark:bg-[#222] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]" style={{ width: 64, height: 64, borderRadius: 6 }}>
            <MIcon name="search" size={28} className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]" />
          </div>
        ) : null}
        {query ? (
          <>
            <h3 className="text-[22px] font-semibold text-[#171717] dark:text-[#e3e3e3] mb-2 tracking-tight">
              No assets match your search
            </h3>
            <p className="text-[15px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] font-normal leading-relaxed">
              Try a different search term.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center w-full">
              <div className="relative h-[80px] w-full flex justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={index}
                    initial={{ opacity: 0, y: 15, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.96 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute text-[26px] font-medium text-[#171717] dark:text-[#e3e3e3] tracking-tight leading-relaxed text-center w-full"
                  >
                    {FACTS[index]}
                  </motion.h3>
                </AnimatePresence>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}
