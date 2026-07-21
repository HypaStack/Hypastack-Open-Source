/**
 * Inline SVG textures used as CSS background images.
 * Kept as data URIs so they cost no request and stay within the CSP's
 * `img-src 'self' data:` allowance.
 */

/**
 * Film grain: fractal noise desaturated to pure luminance. Without the
 * feColorMatrix pass feTurbulence emits RGB noise, which reads as coloured
 * speckle rather than grain. Pair with a low opacity and `mix-blend-mode`.
 */
export const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")"
