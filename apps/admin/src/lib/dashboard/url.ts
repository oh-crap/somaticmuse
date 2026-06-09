// apps/admin/src/lib/dashboard/url.ts
// Helper for preserving URL params across tile form submissions.
// Each tile's form should render hidden inputs for params belonging to
// other tiles, so submitting one tile's form doesn't reset the others.

/** URL param names that each tile owns. */
export const TILE_PARAMS = {
  billing: ["m", "hide_empty"],
  loyalty: ["ly_from", "ly_to"],
  lessons: ["ls_type", "ls_sort", "ls_page"],
  dropouts: ["dr_type", "dr_page"],
  charts: ["ch_end"],
} as const;

export type TileName = keyof typeof TILE_PARAMS;

/**
 * Returns name/value pairs for URL params that should be preserved as
 * hidden inputs in the given tile's form. Owns its prefixes; every
 * other param is forwarded unchanged.
 */
export function preserveOtherTileParams(
  url: URL,
  ownTile: TileName,
): Array<{ name: string; value: string }> {
  const ownParams = new Set<string>(TILE_PARAMS[ownTile]);
  const result: Array<{ name: string; value: string }> = [];
  for (const [name, value] of url.searchParams.entries()) {
    if (!ownParams.has(name)) {
      result.push({ name, value });
    }
  }
  return result;
}