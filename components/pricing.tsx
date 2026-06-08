"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";

type Cycle = "monthly" | "annual";
type FeatureStatus = "included" | "excluded" | "future";
type Feature = { name: string; status: FeatureStatus };
type Plan = { tier: string; storage: string; monthly: number; annual: number; recommended?: boolean; features: Feature[] };

const plans: Plan[] = [
  {
    tier: "Essential",
    storage: "300GB",
    monthly: 13.99,
    annual: 167.99,
    features: [
      { name: "300GB Storage", status: "included" },
      { name: "550MB max file size", status: "included" },
      { name: "200MB max CDN asset size", status: "included" },
      { name: "25 active file shares", status: "included" },
      { name: "30 active CDN links", status: "included" },
      { name: "2× download retention window", status: "included" },
      { name: "Never purge inactive account", status: "included" },
      { name: "Priority Support", status: "excluded" },
      { name: "Custom domains", status: "future" },
    ],
  },
  {
    tier: "Premium",
    storage: "750GB",
    monthly: 24.99,
    annual: 299.99,
    recommended: true,
    features: [
      { name: "750GB Storage", status: "included" },
      { name: "1GB max file size", status: "included" },
      { name: "500MB max CDN asset size", status: "included" },
      { name: "75 active file shares", status: "included" },
      { name: "100 active CDN links", status: "included" },
      { name: "3× download retention window", status: "included" },
      { name: "Never purge inactive account", status: "included" },
      { name: "Priority Support", status: "excluded" },
      { name: "Custom domains", status: "future" },
    ],
  },
  {
    tier: "Ultimate",
    storage: "1.1TB",
    monthly: 39.99,
    annual: 479.99,
    features: [
      { name: "1.1TB Storage", status: "included" },
      { name: "2.5GB max file size", status: "included" },
      { name: "1GB max CDN asset size", status: "included" },
      { name: "500 active file shares", status: "included" },
      { name: "500 active CDN links", status: "included" },
      { name: "4× download retention window", status: "included" },
      { name: "Never purge inactive account", status: "included" },
      { name: "Priority Support", status: "included" },
      { name: "Custom domains", status: "future" },
    ],
  },
];

// Reuse the same block chrome from how-it-works
function BlockLines() {
  return (
    <>
      <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
    </>
  );
}

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("annual");

  // All feature names in order (same for all plans)
  const featureNames = plans[0].features.map(f => f.name);

  return (
    <section id="features" className="mt-24 sm:mt-32 relative flex flex-col items-center overflow-visible">

      {/* The Block — same template as reference */}
      <div className="relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-10 border-y border-[rgba(0,0,0,0.08)]">
        <BlockLines />

        {/* Plus signs grid on sides */}
        <div
          className="absolute top-0 bottom-0 left-[-50vw] right-[100%] pointer-events-none -z-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: 'center'
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-[100%] right-[-50vw] pointer-events-none -z-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: 'center'
          }}
        />

        {/* Header — same as reference */}
        <div className="w-full px-8 sm:px-16 pt-16 pb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.05] tracking-[-0.03em] text-[#171717]"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700 }}
            >
              Unlock <u className="underline decoration-[rgba(0,0,0,0.08)] underline-offset-[0.1em]">higher</u> <i className="italic">limits</i>.
            </h2>
            <p className="mt-3 text-[16px] sm:text-[17px] leading-relaxed text-[#525252]">
              Pick a tier you can grow into. Cancel anytime.
            </p>
          </motion.div>

          {/* Billing toggle — sharp, no border-radius */}
          <div className="flex items-center shrink-0 border border-[rgba(0,0,0,0.08)]">
            <button
              onClick={() => setCycle("monthly")}
              className="px-5 py-2.5 text-[13px] font-medium transition-colors duration-150"
              style={{
                color: cycle === "monthly" ? '#ffffff' : '#525252',
                backgroundColor: cycle === "monthly" ? '#171717' : 'transparent',
              }}
            >
              Monthly
            </button>
            <div className="w-px h-full self-stretch bg-[rgba(0,0,0,0.08)]" />
            <button
              onClick={() => setCycle("annual")}
              className="px-5 py-2.5 text-[13px] font-medium transition-colors duration-150"
              style={{
                color: cycle === "annual" ? '#ffffff' : '#525252',
                backgroundColor: cycle === "annual" ? '#171717' : 'transparent',
              }}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Pricing table — separated from header by border-t, same as video/image pattern */}
        <div className="border-t border-[rgba(0,0,0,0.08)] overflow-x-auto">

          {/* Plan name + price row */}
          <div className="grid grid-cols-3 border-b border-[rgba(0,0,0,0.08)]">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`px-6 py-8 ${i < plans.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''} ${plan.recommended ? 'bg-[#171717]' : ''}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[12px] uppercase tracking-widest font-semibold"
                    style={{ color: plan.recommended ? '#a3a3a3' : '#888' }}
                  >
                    {plan.tier}
                  </span>
                  {plan.recommended && (
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 border border-[rgba(255,255,255,0.15)] text-[#a3a3a3]">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[14px] font-medium" style={{ color: plan.recommended ? '#a3a3a3' : '#888' }}>€</span>
                  <span
                    className="text-[38px] font-bold tracking-tight italic"
                    style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", color: plan.recommended ? '#ffffff' : '#171717' }}
                  >
                    {plan[cycle]}
                  </span>
                  <span className="text-[13px] font-medium" style={{ color: plan.recommended ? '#a3a3a3' : '#888' }}>
                    {cycle === "monthly" ? "/mo" : "/yr"}
                  </span>
                </div>
                <p className="mt-2 text-[13px]" style={{ color: plan.recommended ? '#a3a3a3' : '#525252' }}>
                  {plan.storage} total storage.
                </p>
              </motion.div>
            ))}
          </div>

          {/* Feature rows — each row spans all 3 columns, perfectly aligned */}
          {featureNames.map((name, fi) => (
            <div key={name} className="grid grid-cols-3 border-b border-[rgba(0,0,0,0.08)]">
              {plans.map((plan, pi) => {
                const f = plan.features[fi];
                let iconName = "check";
                let iconColor = "#16a34a";
                if (f.status === "excluded") { iconName = "close"; iconColor = "#dc2626"; }
                else if (f.status === "future") { iconName = "remove"; iconColor = "#aaaaaa"; }
                return (
                  <div
                    key={plan.tier}
                    className={`flex items-center gap-3 px-6 py-4 ${pi < plans.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''}`}
                  >
                    <MIcon name={iconName} size={15} className="shrink-0" style={{ color: iconColor }} />
                    <span className="text-[13px] text-[#171717]">{f.name}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* CTA row */}
          <div className="grid grid-cols-3">
            {plans.map((plan, i) => (
              <Link
                key={plan.tier}
                href="/new"
                className={`flex items-center justify-center gap-2 px-6 py-5 text-[14px] font-semibold transition-colors duration-150 ${i < plans.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''} ${plan.recommended ? 'bg-[#171717] text-white hover:bg-[#222]' : 'text-[#171717] hover:bg-[#fafafa]'}`}
              >
                <MIcon name="contactless" size={15} />
                Get started
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32 w-full" />
    </section>
  );
}
