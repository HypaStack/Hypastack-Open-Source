/**
 * Custom file slug validation.
 *
 * Slugs become the public share URL (`/d/{slug}`). The charset is dictated by
 * the proxy's public-GET allow-list (`/^\/api\/v2\/files\/[a-zA-Z0-9_-]+$/` in
 * proxy.ts) — anything outside `[a-z0-9-]` would be blocked by the proxy-key
 * check, so we constrain to lowercase letters, digits, and single hyphens.
 *
 * Resolution in fileModel is id-first (`WHERE id = $1 OR slug = $1` ordered so an
 * id match wins). The minimum length is 9 — strictly longer than the 8-char
 * random file id (generateFileId) — so the slug and id namespaces are
 * structurally disjoint: a slug can never equal any id, and a future random id
 * can never equal an existing slug. No collision is possible in either direction.
 */

const SLUG_MIN = 9
const SLUG_MAX = 64

// lowercase alphanumerics in hyphen-separated groups: no leading/trailing
// hyphen and no consecutive hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface SlugValidation {
  ok: boolean
  /** The normalized (trimmed + lowercased) slug. */
  slug: string
  error?: string
}

export function validateSlug(input: string): SlugValidation {
  const slug = input.trim().toLowerCase()

  if (slug.length < SLUG_MIN) {
    return { ok: false, slug, error: `Custom link must be at least ${SLUG_MIN} characters.` }
  }
  if (slug.length > SLUG_MAX) {
    return { ok: false, slug, error: `Custom link must be at most ${SLUG_MAX} characters.` }
  }
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      slug,
      error: "Use lowercase letters, numbers, and hyphens only — no spaces, leading/trailing, or double hyphens.",
    }
  }

  return { ok: true, slug }
}

/**
 * Build a list of candidate slugs derived from a base the user wanted but that
 * was already taken. The handler filters these against the DB and returns the
 * first few that are free, so the user gets concrete alternatives to pick from.
 */
export function generateSlugCandidates(base: string, count = 8): string[] {
  // Leave room for the suffix so candidates stay within SLUG_MAX, and strip any
  // trailing hyphen the slice may have introduced.
  const root = base.slice(0, SLUG_MAX - 6).replace(/-+$/, "")
  const out = new Set<string>()

  for (let i = 2; i <= count && out.size < count; i++) {
    out.add(`${root}-${i}`)
  }
  for (let i = 0; i < 4; i++) {
    out.add(`${root}-${Math.random().toString(36).slice(2, 6)}`)
  }

  return [...out]
}
