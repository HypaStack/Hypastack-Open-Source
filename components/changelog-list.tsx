"use client"

import { motion } from "motion/react"
import { Card, Chip, Disclosure, DisclosureGroup, Separator, Typography } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"

type ChangeType = "new" | "improved" | "fixed"

interface ChangeItem {
  type: ChangeType
  text: string
}

interface Release {
  version: string
  date: string
  title: string
  items: ChangeItem[]
}

const TYPE_STYLE: Record<ChangeType, { label: string; color: "accent" | "success" | "warning" }> = {
  new: { label: "New", color: "accent" },
  improved: { label: "Improved", color: "success" },
  fixed: { label: "Fixed", color: "warning" },
}

const RELEASES: Release[] = [
  {
    version: "V3.0",
    date: "August 2026",
    title: "A from-the-ground-up redesign",
    items: [
      { type: "new", text: "Every screen rebuilt on real HeroUI components — no more mixed styling." },
      { type: "new", text: "Redesigned upload tray with a live file table and toggle-hidden options." },
      { type: "new", text: "New pricing page with a real plan comparison table." },
      { type: "improved", text: "Storage usage now shown right in the sidebar." },
      { type: "improved", text: "Bin and download pages are cleaner and load faster." },
      { type: "fixed", text: "Dozens of small spacing, alignment and color inconsistencies." },
    ],
  },
  {
    version: "V2.4",
    date: "May 2026",
    title: "Funnels and Peerline",
    items: [
      { type: "new", text: "Funnels — collect one-time file drops without an account." },
      { type: "new", text: "Peerline — send files device to device, nothing stored." },
      { type: "improved", text: "Faster uploads for large files on paid plans." },
    ],
  },
  {
    version: "V2.0",
    date: "January 2026",
    title: "CDN and custom links",
    items: [
      { type: "new", text: "Edge — host assets on permanent, public URLs." },
      { type: "new", text: "Custom share links on paid plans." },
      { type: "fixed", text: "Expiration timers no longer drift under heavy load." },
    ],
  },
]

function ChangeRow({ item }: { item: ChangeItem }) {
  const { label, color } = TYPE_STYLE[item.type]
  return (
    <li className="flex items-start gap-3">
      <Chip size="sm" variant="soft" color={color} className="mt-0.5 shrink-0 uppercase tracking-wide">
        {label}
      </Chip>
      <Typography type="body-sm" className="leading-snug text-foreground">{item.text}</Typography>
    </li>
  )
}

export function ChangelogList() {
  const [latest, ...older] = RELEASES

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="text-center mb-14"
      >
        <Typography type="h1" className="text-[clamp(36px,5vw,52px)] text-foreground">Changelog</Typography>
        <Typography type="body" color="muted" className="mt-3">
          Everything new, improved, and fixed at Hypastack.
        </Typography>
      </motion.div>

      {/* Latest release, always expanded */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Card variant="transparent" className="!p-0 !gap-0 flex flex-col overflow-hidden rounded-[16px] border !border-solid border-accent/40 bg-overlay">
          <Card.Header className="p-7 pb-0">
            <div className="flex items-center gap-2.5">
              <Chip size="sm" variant="soft">{latest.version}</Chip>
              <Typography type="body-xs" color="muted">{latest.date}</Typography>
            </div>
            <Card.Title className="mt-2 text-2xl">{latest.title}</Card.Title>
          </Card.Header>
          <Card.Content className="p-7">
            <ul className="flex flex-col gap-3">
              {latest.items.map((item, i) => (
                <ChangeRow key={i} item={item} />
              ))}
            </ul>
          </Card.Content>
        </Card>
      </motion.div>

      {/* Earlier releases, collapsed by default */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="mt-10"
      >
        <Typography type="body-sm" weight="semibold" className="mb-3 text-muted">Earlier releases</Typography>
        <DisclosureGroup allowsMultipleExpanded className="flex flex-col gap-2">
          {older.map((release) => (
            <Disclosure key={release.version} className="rounded-[16px] border border-white/10 bg-overlay px-5">
              <Disclosure.Heading>
                <Disclosure.Trigger className="flex w-full items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-2.5 text-left">
                    <Chip size="sm" variant="soft">{release.version}</Chip>
                    <Typography type="body-sm" weight="medium" className="text-foreground">{release.title}</Typography>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-muted">
                    <Typography type="body-xs" color="muted">{release.date}</Typography>
                    <Disclosure.Indicator>
                      <MIcon name="expand_more" size={18} />
                    </Disclosure.Indicator>
                  </div>
                </Disclosure.Trigger>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="pb-5">
                  <Separator className="mb-4" />
                  <ul className="flex flex-col gap-3">
                    {release.items.map((item, i) => (
                      <ChangeRow key={i} item={item} />
                    ))}
                  </ul>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          ))}
        </DisclosureGroup>
      </motion.div>
    </div>
  )
}
