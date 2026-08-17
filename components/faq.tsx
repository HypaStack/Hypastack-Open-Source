"use client";

import { motion } from "motion/react";
import { Accordion } from "@heroui/react";
import { faqs } from "@/components/faq-data";

const HEADING_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" };

export function Faq() {
  return (
    <section id="faq" className="relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px] mt-0">
      <div className="relative w-full flex flex-col bg-black z-[60]">
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
          <p className="mt-4 text-[17px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
The stuff people usually ask us.
          </p>
        </motion.div>

        <div className="w-full px-8 sm:px-6 pb-16">
          <Accordion
            variant="surface"
            defaultExpandedKeys={[0]}
            className="relative z-10"
            style={{ "--surface": "var(--surface-tertiary)" } as React.CSSProperties}
          >
            {faqs.map((item, i) => (
              <Accordion.Item key={item.q} id={i}>
                <Accordion.Heading>
                  <Accordion.Trigger>
                    <span className="text-[15px] sm:text-[16px] text-[#f7f8f8] leading-[1.4]" style={{ ...HEADING_FONT, fontWeight: 600 }}>
                      {item.q}
                    </span>
                    <Accordion.Indicator>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-[16px] leading-relaxed text-[#898e97] max-w-3xl">{item.a}</p>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
      </div>
    </section>
  );
}
