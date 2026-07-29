import type { ScoredModel } from './scoring'

export interface PickRouteOptions {
  /** How many top models to route to (1 = single best, 3 = Trio). */
  k: number
  /**
   * Predicate: can this model slug actually be executed? A model is runnable
   * when it has an OpenRouter id or a direct-provider entry — the same check
   * `runComparison` performs before calling a model. Injected so this stays a
   * pure function and tests don't touch the DB or the provider map.
   */
  runnable: (slug: string) => boolean
}

/**
 * Turn a ranked recommendation list into a routing decision.
 *
 * `scoreModels()` already orders models best-first for the task and the user's
 * priorities; routing is just "take the top-k models we can actually run." We
 * filter out models with no execution path (no OpenRouter id and no direct
 * provider) WITHOUT reordering the survivors, then return the first `k`.
 *
 * Returns `[]` when nothing is runnable, so callers can surface a clear
 * "no runnable model for this task" instead of silently calling nothing.
 */
export function pickRoute(scored: ScoredModel[], opts: PickRouteOptions): ScoredModel[] {
  if (opts.k <= 0) return []
  const runnable = scored.filter((m) => opts.runnable(m.slug))
  return runnable.slice(0, opts.k)
}

/**
 * Like `pickRoute`, but anchored on a specific model instead of always
 * starting from the overall top rank — lets a user run/Trio/Challenger from
 * any ranked card, not just #1. Returns the anchor plus however many runnable
 * models follow it in rank order, capped at `k` total.
 *
 * Returns `[]` if the anchor itself isn't runnable (or isn't in `scored` at
 * all) — the caller should treat that as "this model isn't available to run
 * directly," the same way `pickRoute` returning `[]` means "nothing runnable."
 */
export function pickRouteFrom(
  scored: ScoredModel[],
  anchorSlug: string,
  opts: PickRouteOptions,
): ScoredModel[] {
  if (opts.k <= 0) return []
  const runnable = scored.filter((m) => opts.runnable(m.slug))
  const anchorIndex = runnable.findIndex((m) => m.slug === anchorSlug)
  if (anchorIndex === -1) return []
  return runnable.slice(anchorIndex, anchorIndex + opts.k)
}
