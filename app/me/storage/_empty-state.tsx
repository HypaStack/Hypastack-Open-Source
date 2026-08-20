"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"

import { MIcon } from "@/components/ui/material-icon"

export function EmptyState({ query, username }: { query: string; username: string }) {
  const FACTS = [
    `still empty ${username}`,
    "no algorithm deciding what you see here",
    "we're not training an ai on your files",
    "no thirty page terms of service to hide anything in",
    "we don't sell what we can't even read",
    "no cookie banner because there's nothing to track",
    "your files don't become someone else's dataset",
    "delete actually means delete here",
    "no exec somewhere staring at a graph of your uploads",
    "one guy runs this not a growth team",
    "no dark patterns just a button that uploads a file",
    "burn on read because delete shouldn't need air quotes",
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] mb-5">
            <MIcon name="search" size={28} className="text-[#666] dark:text-[#898e97]" />
          </div>
        ) : null}
        {query ? (
          <>
            <h3 className="text-[22px] font-semibold text-[#111] dark:text-[#f0f0f0] mb-2 tracking-tight">
              No files match your search
            </h3>
            <p className="text-[15px] text-[#666] dark:text-[#898e97] font-normal leading-relaxed">
              Try a different search term.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center w-full -translate-y-12">
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
