import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import type { ModeStrategy } from '../modes/modeStrategy';
import { runRankingPipeline } from './rankingPipeline';

export interface RankedPath {
  path: string;
  score: number;
}

export function rankContextFiles(
  state: ProjectState,
  events: WorkspaceEvent[],
  strategy: ModeStrategy,
  shouldIgnore?: (path: string) => boolean,
): RankedPath[] {
  return runRankingPipeline(state, events, strategy, shouldIgnore, 0).ranked;
}

export function rankContextFilesWithDebug(
  state: ProjectState,
  events: WorkspaceEvent[],
  strategy: ModeStrategy,
  shouldIgnore: ((path: string) => boolean) | undefined,
  debugTop: number,
): { ranked: RankedPath[]; debugExplanations: string[] } {
  return runRankingPipeline(state, events, strategy, shouldIgnore, debugTop);
}
