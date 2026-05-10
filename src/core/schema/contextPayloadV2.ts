import type { AIMode } from '../context/modeEngine';
import type { WorkspaceEvent } from '../models/events';
import type { WorkspaceMemory } from '../models/workspaceMemory';
import type { ActivityAnalysis } from '../semantic/activityAnalyzer';

/**
 * Context Schema v2 (spec 2.2) — stable shape for JSON / MCP / agents.
 */
export interface ContextPayloadV2 {
  session: { id: string };
  task: { text: string };
  summary: { semanticMarkdown: string };
  workingFiles: string[];
  priorityFiles: { path: string; score: number }[];
  gitState: { staged: string[]; modified: string[] };
  semanticContext: {
    topFolders: [string, number][];
    fileActivityTop: [string, number][];
  };
  recentEvents: WorkspaceEvent[];
  /** Lightweight file co-occurrence (spec 2.3) */
  contextGraph?: Record<string, string[]>;
  instructions: { mode: AIMode; text: string; strategy: string };
  /** Spec 2.4 addendum: behavioral intent sidecar */
  intelligence?: {
    likelyIntent: string;
    developmentPattern: string;
    workspaceFocus: string;
  };
  /** Spec 2.4 addendum: heuristic export quality */
  quality?: {
    score: number;
    warnings: string[];
  };
}

export function buildContextPayloadV2(
  memory: WorkspaceMemory,
  priority: { path: string; score: number }[],
  semanticMarkdown: string,
  analysis: ActivityAnalysis,
  mode: AIMode,
  instruction: string,
  strategyLabel: string,
  contextGraph?: Record<string, string[]>,
  intelligence?: ContextPayloadV2['intelligence'],
  quality?: ContextPayloadV2['quality'],
): ContextPayloadV2 {
  const topFolders = Object.entries(analysis.folderHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) as [string, number][];
  const fileActivityTop = Object.entries(analysis.fileActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15) as [string, number][];

  return {
    session: { id: memory.sessionId },
    task: { text: memory.task },
    summary: { semanticMarkdown },
    workingFiles: memory.workingFiles,
    priorityFiles: priority,
    gitState: {
      staged: memory.gitState.staged,
      modified: memory.gitState.modified,
    },
    semanticContext: {
      topFolders,
      fileActivityTop,
    },
    recentEvents: memory.recentEvents,
    contextGraph,
    instructions: { mode, text: instruction, strategy: strategyLabel },
    intelligence,
    quality,
  };
}
