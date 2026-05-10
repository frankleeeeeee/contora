import { topHotDirectories } from './hotAreaDetector';

/**
 * One-line description of current development hotspot (semantic block / payload).
 */
export function formatWorkspaceFocusLine(directoryWeights: Record<string, number>, maxAreas = 2): string {
  const tops = topHotDirectories(directoryWeights, maxAreas);
  if (!tops.length) {
    return 'No strong directory hotspot (yet) from recent focus/save/Git signals.';
  }
  return tops.map((d) => `${d}/*`).join(' · ');
}
