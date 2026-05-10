/**
 * Deduplicate paths (stable order, case-insensitive).
 */
export function dedupeOrderedPaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    const k = p.replace(/\\/g, '/').toLowerCase();
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function countDuplicatePaths(paths: readonly string[]): number {
  const norm = paths.map((p) => p.replace(/\\/g, '/').toLowerCase());
  return Math.max(0, norm.length - new Set(norm).size);
}
