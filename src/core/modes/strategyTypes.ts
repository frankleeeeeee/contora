/** Per-mode ranking / export strategy (spec 2.4: mode → context strategy). */
export interface ModeStrategy {
  maxPriorityFiles: number;
  weights: {
    focus: number;
    save: number;
    gitStaged: number;
    gitWorking: number;
    openTab: number;
    workingSetRecency: number;
    taskKeyword: number;
  };
  strategyLabel: string;
}
