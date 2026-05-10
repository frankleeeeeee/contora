/**
 * Spec 2.3 — base multipliers for ranking signals (multiplied by `ModeStrategy.weights`).
 * Centralized for tuning and doc alignment.
 */
export const RANKING_FACTORS = {
  gitStagedPresence: 10,
  gitWorkingPresence: 8,
  openTabPresence: 6,
  workingSetRecencyMax: 20,
  perFocusUnit: 4,
  perSaveUnit: 5,
  taskKeywordHit: 6,
} as const;
