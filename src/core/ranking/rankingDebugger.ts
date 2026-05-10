import type { ModeStrategy } from '../modes/modeStrategy';
import type { PathScoreRaw } from './scoreCalculator';
import type { ScoreBreakdownMax } from './scoreNormalizer';
import { combinedNormalizedScore, maxScoreBreakdown, unit } from './scoreNormalizer';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Human-readable “why this path scored high” (spec 2.4 addendum).
 */
export function formatPathRankingExplain(raw: PathScoreRaw, maxes: ScoreBreakdownMax, strategy: ModeStrategy): string {
  const w = strategy.weights;
  const lines: string[] = [`Ranking breakdown: ${raw.path}`];
  const push = (label: string, weightedPart: number, r: number, m: number) => {
    if (r <= 0 && m <= 0) {
      return;
    }
    const u = unit(r, m);
    lines.push(`  +${round2(weightedPart)}  ${label} (raw ${round2(r)}, max ${round2(m)} → ${round2(u)}%)`);
  };
  const total = combinedNormalizedScore(raw, maxes, strategy);
  push('git staged', w.gitStaged * unit(raw.gitStaged, maxes.gitStaged), raw.gitStaged, maxes.gitStaged);
  push('git working', w.gitWorking * unit(raw.gitWorking, maxes.gitWorking), raw.gitWorking, maxes.gitWorking);
  push('open tab', w.openTab * unit(raw.openTab, maxes.openTab), raw.openTab, maxes.openTab);
  push(
    'working set recency',
    w.workingSetRecency * unit(raw.workingSetRecency, maxes.workingSetRecency),
    raw.workingSetRecency,
    maxes.workingSetRecency,
  );
  push('focus events', w.focus * unit(raw.focusCount, maxes.focusCount), raw.focusCount, maxes.focusCount);
  push('save events', w.save * unit(raw.saveCount, maxes.saveCount), raw.saveCount, maxes.saveCount);
  push('task keyword', w.taskKeyword * unit(raw.taskKeyword, maxes.taskKeyword), raw.taskKeyword, maxes.taskKeyword);
  lines.push(`  → Normalized blend score: ${round2(total)}`);
  return lines.join('\n');
}

export function buildTopRankingDebugLines(
  paths: PathScoreRaw[],
  strategy: ModeStrategy,
  topN: number,
): string[] {
  if (!paths.length) {
    return [];
  }
  const maxes = maxScoreBreakdown(paths);
  const scored = paths
    .map((raw) => ({
      raw,
      score: combinedNormalizedScore(raw, maxes, strategy),
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(({ raw }) => formatPathRankingExplain(raw, maxes, strategy));
}
