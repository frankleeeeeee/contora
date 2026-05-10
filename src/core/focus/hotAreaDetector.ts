/**
 * Top hot-directory keys from `directoryWeights` (spec 2.4 addendum).
 */
export function topHotDirectories(directoryWeights: Record<string, number>, limit: number): string[] {
  return Object.entries(directoryWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, limit))
    .map(([d]) => d);
}
