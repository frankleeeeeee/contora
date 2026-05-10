import type { ModeStrategy } from '../modes/modeStrategy';
import type { PathScoreRaw } from './scoreCalculator';

/** Per-dimension max over candidates (for 0–100 normalization). */
export type ScoreBreakdownMax = Omit<PathScoreRaw, 'path'>;

export function maxScoreBreakdown(rows: PathScoreRaw[]): ScoreBreakdownMax {
  const z: ScoreBreakdownMax = {
    gitStaged: 0,
    gitWorking: 0,
    openTab: 0,
    workingSetRecency: 0,
    focusCount: 0,
    saveCount: 0,
    taskKeyword: 0,
  };
  for (const r of rows) {
    z.gitStaged = Math.max(z.gitStaged, r.gitStaged);
    z.gitWorking = Math.max(z.gitWorking, r.gitWorking);
    z.openTab = Math.max(z.openTab, r.openTab);
    z.workingSetRecency = Math.max(z.workingSetRecency, r.workingSetRecency);
    z.focusCount = Math.max(z.focusCount, r.focusCount);
    z.saveCount = Math.max(z.saveCount, r.saveCount);
    z.taskKeyword = Math.max(z.taskKeyword, r.taskKeyword);
  }
  return z;
}

export function unit(x: number, m: number): number {
  if (m <= 0) {
    return 0;
  }
  return (x / m) * 100;
}

const W_SUM = (w: ModeStrategy['weights']): number =>
  w.gitStaged + w.gitWorking + w.openTab + w.workingSetRecency + w.focus + w.save + w.taskKeyword;

/**
 * Scale each source to 0–100, then blend with mode weights (avoids one Git dimension dominating).
 */
export function combinedNormalizedScore(raw: PathScoreRaw, maxes: ScoreBreakdownMax, strategy: ModeStrategy): number {
  const w = strategy.weights;
  const parts =
    w.gitStaged * unit(raw.gitStaged, maxes.gitStaged) +
    w.gitWorking * unit(raw.gitWorking, maxes.gitWorking) +
    w.openTab * unit(raw.openTab, maxes.openTab) +
    w.workingSetRecency * unit(raw.workingSetRecency, maxes.workingSetRecency) +
    w.focus * unit(raw.focusCount, maxes.focusCount) +
    w.save * unit(raw.saveCount, maxes.saveCount) +
    w.taskKeyword * unit(raw.taskKeyword, maxes.taskKeyword);
  const sw = W_SUM(w);
  return sw > 0 ? parts / sw : 0;
}
