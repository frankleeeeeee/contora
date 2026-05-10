import type { ModeStrategy } from './strategyTypes';

export const featureStrategy: ModeStrategy = {
  maxPriorityFiles: 14,
  weights: {
    focus: 2,
    save: 4,
    gitStaged: 3,
    gitWorking: 4,
    openTab: 5,
    workingSetRecency: 4,
    taskKeyword: 3,
  },
  strategyLabel: 'feature: balanced working set, open tabs, and task keywords',
};
