export type ProPromptKind = 'semantic' | 'intent' | 'compression';

export interface ProPromptPair {
  system: string;
  user: string;
}

/** Optional hook: builds may adjust ranking before normalization. */
export type RankingPathHook = (path: string, baseScore: number) => number;
