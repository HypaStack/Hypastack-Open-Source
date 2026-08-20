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
  { label: "Drive", href: "/me/files", icon: "hard_drive", hint: "Share files with expiring links" },
  { label: "Edge", href: "/me/cdn", icon: "cloud", hint: "Host assets on permanent URLs" },
  { label: "Funnel", href: "/me/funnel", icon: "forward_to_inbox", hint: "Receive files through one-time links" },
  { label: "Bin", href: "/me/bin", icon: "edit_note", hint: "Paste and share text" },
]

/** Owner-only, appended to SECTION_BUTTONS at render time when user.isOwner. */
export const ADMIN_NAV_ITEM: NavItem = { label: "Admin", href: "/me/admin", icon: "shield_person", hint: "Manage invite codes and accounts" }

/** width of the secondary (sub-nav) sidebar in pixels */
export const SIDEBAR_WIDTH = 233

/** Number of files shown per page in the file list */
export const FILES_PER_PAGE = 10
