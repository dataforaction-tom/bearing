/**
 * Restrict a user-supplied `?redirect=` query param to a same-origin local
 * path before passing it to router.push()/similar. Without this, a crafted
 * link like `?redirect=//attacker.example` or `?redirect=javascript:...`
 * could send a signed-in user's browser somewhere attacker-controlled.
 *
 * Only accepts a string starting with exactly one "/" — not "//" (protocol-
 * relative) or "/\" (some browsers normalize backslash to slash before
 * scheme parsing, defeating a same-origin check that only looks for "//").
 */
export function sanitizeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback
  return /^\/(?!\/|\\)/.test(path) ? path : fallback
}
