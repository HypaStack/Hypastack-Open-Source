/**
 * Dashboard navigation constants.
 * Defines the section buttons and sub-navigation items for the manage layout.
 */

export interface NavItem {
  label: string
  href: string
  icon: string
  /** Shown in the sidebar hover tooltip. */
  hint?: string
}

/** Primary section buttons shown in the icon sidebar */
export const SECTION_BUTTONS: NavItem[] = [
  { label: "Drive", href: "/manage/files", icon: "hard_drive", hint: "Share files with expiring links" },
  { label: "CDN", href: "/manage/cdn", icon: "cloud", hint: "Host assets on permanent URLs" },
  { label: "Funnel", href: "/manage/funnel", icon: "forward_to_inbox", hint: "Receive files through one-time links" },
  { label: "Scratch", href: "/manage/dumpster", icon: "delete", hint: "Paste and share text" },
]

/** Sub-navigation items for the Drive section */
export const DRIVE_SUBNAV: NavItem[] = [
  { label: "Files", href: "/manage/files", icon: "folder" },
]

/** Sub-navigation items for the Funnel section */
export const FUNNEL_SUBNAV: NavItem[] = [
  { label: "Inbox", href: "/manage/funnel", icon: "inbox" },
]

/** sub-navigation items for the CDN section */
export const CDN_SUBNAV: NavItem[] = [
  { label: "Assets", href: "/manage/cdn", icon: "cloud" },
]

/** Sub-navigation items for the Scratch section */
export const SCRATCH_SUBNAV: NavItem[] = [
  { label: "New Paste", href: "/manage/dumpster", icon: "add_notes" },
]

/** Determines the display order for section slide animations */
export const SECTION_ORDER: Record<string, number> = {
  Drive: 0,
  CDN: 1,
  Funnel: 2,
  Scratch: 3,
}

/** width of the secondary (sub-nav) sidebar in pixels */
export const SIDEBAR_WIDTH = 272

/** Number of files shown per page in the file list */
export const FILES_PER_PAGE = 10
