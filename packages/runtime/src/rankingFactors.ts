/**
 * Base multipliers for ranking signals (mode strategy weights apply on top).
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
