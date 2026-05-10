import type { ModeStrategy } from './strategyTypes';

export const debugStrategy: ModeStrategy = {
  maxPriorityFiles: 16,
  weights: {
    focus: 3,
    save: 6,
    gitStaged: 2,
    gitWorking: 5,
    openTab: 4,
    workingSetRecency: 3,
    taskKeyword: 2,
  },
  strategyLabel: 'debug: emphasize recent saves, working-tree changes, and active editors',
};
