export type ButtonSize = "xs" | "sm" | "md" | "lg"

export interface ButtonSizeSpec {
  height: number
  padding: number
  fontSize: number
  radius: number
}

/**
 * Shared by ShineButton and SecondaryButton so a primary and a secondary at the
 * same `size` always line up in a row. Don't fork this per component.
 */
export const BUTTON_SIZES: Record<ButtonSize, ButtonSizeSpec> = {
  xs: { height: 28, padding: 10, fontSize: 12, radius: 8 },
  sm: { height: 32, padding: 12, fontSize: 13, radius: 10 },
  md: { height: 40, padding: 16, fontSize: 14, radius: 12 },
  lg: { height: 48, padding: 20, fontSize: 15, radius: 14 },
}
