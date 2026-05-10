import type { ActivityAnalysis } from './activityAnalyzer';

/** Top first-segment directories from activity aggregation. */
export function hotTopDirectories(analysis: ActivityAnalysis, limit: number): string[] {
  return Object.entries(analysis.folderHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([d]) => d);
}
