"use client"

import { useSyncExternalStore } from "react"
import { MIcon } from "@/components/ui/material-icon"

const COOKIE_NAME = "no_ads"
const DISMISS_EVENT = "hypa-ads-dismissed"

function readDismissed(): boolean {
  return document.cookie.split("; ").some((c) => c.trim() === `${COOKIE_NAME}=true`)
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onStoreChange)
  return () => window.removeEventListener(DISMISS_EVENT, onStoreChange)
}

function dismiss() {
  document.cookie = `${COOKIE_NAME}=true; path=/; max-age=31536000`
  window.dispatchEvent(new Event(DISMISS_EVENT))
}

/** Pinned to the left edge of the page, independent of the centered card; hidden once there's no room for it, or once closed (remembered via the `no_ads` cookie). */
export function SideAd() {
  // Hidden on the server snapshot so it can only ever appear, never flash.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  if (dismissed) return null

  return (
    <div className="hidden xl:block absolute left-8 top-1/2 -translate-y-1/2">
      <div className="relative">
        <img
          src="https://r2.hypastack.com/cdn/hypassets/hypamail-ad.png"
          alt=""
          className="block w-[280px] h-auto rounded-[16px] border border-white/10 select-none"
          draggable={false}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close ad"
          className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full bg-overlay border border-white/10 text-foreground hover:bg-white/10 transition-colors"
        >
          <MIcon name="close" size={14} />
        </button>
      </div>
    </div>
  )
}
