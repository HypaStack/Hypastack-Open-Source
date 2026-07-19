// One surface scale for the whole app. Panels, cards, menus and trays all sit
// on `panel` so nothing reads as a different material. Solid rather than a
// white alpha, since these float over backgrounds of varying lightness.
export const SURFACE = {
  panel: "bg-[#f7f7f8] dark:bg-[#171717]",
  // A selected row settles onto the panel fill; hover stops just short of it.
  hover: "hover:bg-[#fafafa] dark:hover:bg-[#131313]",
  active: "bg-[#f7f7f8] dark:bg-[#171717]",
}

/** Raw fills, for inline styles and canvas-ish cases that can't take a class. */
export const SURFACE_HEX = { light: "#f7f7f8", dark: "#171717" } as const
