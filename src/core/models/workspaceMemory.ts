import type { WorkspaceEvent } from './events';

/** Structured memory consumed by Context Builder + adapters (spec 2.0 / 2.1). */
export interface WorkspaceMemory {
  sessionId: string;
  task: string;
  /** Working set / recent paths */
  workingFiles: string[];
  /** Currently open editor tabs */
  openFiles: string[];
  gitState: {
    modified: string[];
    staged: string[];
  };
  notes: string;
  recentEvents: WorkspaceEvent[];
  /** Ranked paths for AI token budget (spec 2.2). */
  priorityFiles?: { path: string; score: number }[];
  /** Heuristic semantic summary markdown (spec 2.2). */
  semanticSummary?: string;
  /** Co-occurrence graph summary text (spec 2.3) */
  contextGraphSummary?: string;
}
