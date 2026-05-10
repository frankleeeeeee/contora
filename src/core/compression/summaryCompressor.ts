/**
 * Tiered compression: keep basename only for lower-priority paths to save tokens (spec 2.4 addendum).
 */
export function basenameOnly(rel: string): string {
  const p = rel.replace(/\\/g, '/');
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(i + 1) : p;
}

export function tierCompressPaths(paths: readonly string[], fullCount: number): { fullPaths: string[]; shortLabels: string[] } {
  const fullPaths = paths.slice(0, Math.max(0, fullCount));
  const tail = paths.slice(fullCount);
  const shortLabels = tail.map((p) => basenameOnly(p));
  return { fullPaths, shortLabels };
}
