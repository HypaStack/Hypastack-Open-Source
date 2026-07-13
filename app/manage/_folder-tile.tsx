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
      className="group flex items-center gap-2.5 h-[52px] px-3 rounded-[12px] cursor-pointer select-none bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)] hover:bg-[#eaeaea] dark:hover:bg-[rgba(255,255,255,0.04)] active:scale-[0.99] transition-all"
    >
      <MIcon name="folder" size={18} className="text-[#666] dark:text-[#898e97] shrink-0" />
      <span className="text-[14px] font-medium text-[#111] dark:text-[#f7f8f8] min-w-0 truncate flex-1">{name}</span>
      {/*
        Opacity lives on this wrapper, not the button: ShineButton sets opacity
        inline, which would beat any class we put on it.
        Always reachable on touch, hover-revealed on pointer devices.
      */}
      <span className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
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
    </div>
  )
}
