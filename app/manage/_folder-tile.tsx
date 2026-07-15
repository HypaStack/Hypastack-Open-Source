"use client"

import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"

export function FolderTile({
  name,
  onOpen,
  onDelete,
}: {
  name: string
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col items-center gap-0.5 py-2 w-[88px] mx-auto cursor-pointer select-none"
    >
      {/*
        Opacity lives on this wrapper, not the button: ShineButton sets opacity
        inline, which would beat any class we put on it.
        Always reachable on touch, hover-revealed on pointer devices.
      */}
      <span className="absolute top-1 right-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
        <ShineButton
          size="xs"
          iconOnly
          color="#dc2626"
          hoverColor="#b91c1c"
          onClick={onDelete}
          aria-label={`Delete folder ${name}`}
        >
          <MIcon name="delete" size={14} />
        </ShineButton>
      </span>
      <img
        loading="lazy"
        decoding="async"
        src="https://r2.hypastack.com/cdn/dashboardasset/folder.webp"
        alt=""
        className="w-[88px] h-auto pointer-events-none group-active:scale-[0.97] transition-transform"
      />
      <span className="block w-full truncate text-center text-[13px] font-medium text-[#111] dark:text-[#f7f8f8]">{name}</span>
    </div>
  )
}
