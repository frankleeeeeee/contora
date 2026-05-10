import type { ModeStrategy } from './strategyTypes';

export const refactorStrategy: ModeStrategy = {
  maxPriorityFiles: 18,
  weights: {
    focus: 3,
    save: 4,
    gitStaged: 3,
    gitWorking: 6,
    openTab: 4,
    workingSetRecency: 5,
    taskKeyword: 2,
  },
  strategyLabel: 'refactor: emphasize broad working-set and repeated touches',
};
