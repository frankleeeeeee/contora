import type { ModeStrategy } from './strategyTypes';

export const reviewStrategy: ModeStrategy = {
  maxPriorityFiles: 20,
  weights: {
    focus: 2,
    save: 3,
    gitStaged: 8,
    gitWorking: 4,
    openTab: 3,
    workingSetRecency: 2,
    taskKeyword: 2,
  },
  strategyLabel: 'review: emphasize staged files and git-visible changes',
};
