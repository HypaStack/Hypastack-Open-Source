/**
 * Dashboard navigation constants.
 * Defines the section buttons and sub-navigation items for the manage layout.
 */

export interface NavItem {
  label: string
  href: string
  icon: string
}

/** Primary section buttons shown in the icon sidebar */
export const SECTION_BUTTONS: NavItem[] = [
  { label: "Drive", href: "/manage/files", icon: "hard_drive" },
  { label: "CDN", href: "/manage/cdn", icon: "cloud" },
]

/** Sub-navigation items for the Drive section */
export const DRIVE_SUBNAV: NavItem[] = [
  { label: "Files", href: "/manage/files", icon: "folder" },
  { label: "Analytics", href: "/manage/files/analytics", icon: "bar_chart" },
  { label: "Recent", href: "/manage/files/recent", icon: "schedule" },
]

/** Sub-navigation items for the CDN section */
export const CDN_SUBNAV: NavItem[] = [
  { label: "Assets", href: "/manage/cdn", icon: "cloud" },
  { label: "Analytics", href: "/manage/cdn/analytics", icon: "bar_chart" },
]

/** Determines the display order for section slide animations */
export const SECTION_ORDER: Record<string, number> = {
  Drive: 0,
  CDN: 1,
  Canary: 2,
}

/** Width of the secondary (sub-nav) sidebar in pixels */
export const SIDEBAR_WIDTH = 232

/** Number of files shown per page in the file list */
export const FILES_PER_PAGE = 10
