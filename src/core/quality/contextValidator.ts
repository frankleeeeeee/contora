/**
 * Quick check: whether too many paths would be filtered by ignore rules (spec 2.4 addendum).
 */
export function listIgnoredPathIssues(paths: readonly string[], shouldIgnore: (p: string) => boolean): string[] {
  const issues: string[] = [];
  let hit = 0;
  for (const p of paths) {
    if (shouldIgnore(p)) {
      hit++;
    }
  }
  if (paths.length > 0 && hit / paths.length > 0.2) {
    issues.push(`Over 20% of priority-like paths match ignore rules (${hit}/${paths.length}) — check filters.`);
  }
  return issues;
}
