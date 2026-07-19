"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { SURFACE } from "@/components/ui/surface"

const TIPS = [
  { title: "Burn after reading", body: "Flip on burn after download and the file deletes itself the moment someone grabs it." },
  { title: "One link, many files", body: "Zip your files in the upload tray and they go out as a single share link." },
  { title: "Pick your own link", body: "On paid plans you can name the link yourself instead of taking a random one." },
  { title: "Grab a lot at once", body: "Hold CTRL and drag across your files to select a bunch in one go." },
  { title: "Set an expiry", body: "The slider in the upload tray goes from one minute up to thirty days." },
  { title: "Collect files from anyone", body: "Send a funnel link and someone can drop you a file without making an account." },
  { title: "Linking it somewhere?", body: "Use CDN, not a share link. Share links expire, CDN URLs do not." },
  { title: "Swap without relinking", body: "Hot swap replaces a CDN asset in place and every link pointing at it keeps working." },
  { title: "Say something with it", body: "Add a note to a share and whoever opens the link reads it next to the download." },
  { title: "Right click anything", body: "Files and assets have a context menu with copy, rename and delete already in it." },
  { title: "Paste it instead", body: "Dumpster turns a block of text into a link without making a file first." },
  { title: "Skip the upload button", body: "Drag files straight onto the page from anywhere in the dashboard." },
  { title: "Lost an upload?", body: "Close the tab mid upload and it picks up where it left off next time you open the dashboard." },
  { title: "Reporting a bug?", body: "Grab your UUID from the account menu at the top and paste it in. It speeds things up a lot." },
]

export function TipCard() {
  const [index, setIndex] = useState(0)

  // Picked after mount so the server and the first client render agree.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * TIPS.length))
  }, [])

  const tip = TIPS[index]

  return (
    <div className={`rounded-[10px] ${SURFACE.panel} px-3 py-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <MIcon name="lightbulb" size={14} className="text-[#555] dark:text-[#a8a8a8] shrink-0" />
        <span className="text-xs font-medium text-[#555] dark:text-[#a8a8a8] truncate">
          TIP: {tip.title}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed text-[#333] dark:text-[#dcdcdc]">
        {tip.body}
      </p>
    </div>
  )
}
