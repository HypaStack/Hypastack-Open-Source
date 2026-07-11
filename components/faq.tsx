"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { faqs } from "@/components/faq-data";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

const HEADING_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" };

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px] mt-0">
      <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full px-8 sm:px-6 pt-16 pb-14 relative z-10 pointer-events-none"
        >
          <h2
            className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-normal"
            style={HEADING_FONT}
          >
            Frequently Asked <span className="text-[#898e97]">Questions</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
The stuff people usually ask us.
          </p>
        </motion.div>

        <div className="w-full px-8 sm:px-6 pb-16">
          <Accordion className="relative z-10">
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                open={open === i}
                onOpenChange={(next) => setOpen(next ? i : null)}
                delay={i * 0.04}
                title={
                  <span className="text-[15px] sm:text-[16px] text-[#f7f8f8] leading-[1.4]" style={{ ...HEADING_FONT, fontWeight: 600 }}>
                    {item.q}
                  </span>
                }
                headerStyle={{ padding: "20px 32px" }}
                panelStyle={{ padding: "0 32px 24px" }}
              >
                <p className="text-[14px] leading-relaxed text-[#898e97] max-w-3xl">{item.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      </div>
    </section>
  );
}
