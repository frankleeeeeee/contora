import type { ActivityAnalysis } from './activityAnalyzer';
import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import { dedupeOrderedPaths } from '../compression/duplicateReducer';
import { tierCompressPaths } from '../compression/summaryCompressor';
import { buildBehaviorIntelligence } from './intentEngine';
import { inferLikelyGoalLine } from './taskInference';

export interface SemanticSummaryBlock {
  markdown: string;
  intelligence: {
    likelyIntent: string;
    developmentPattern: string;
    workspaceFocus: string;
  };
}

export interface BuildSemanticSummaryOptions {
  /** Debug lines from `runRankingPipeline` / `rankContextFilesWithDebug` */
  rankingDebug?: readonly string[];
  /** Append tier-compressed low-priority file names (basename only) in summary */
  tierCompressAfter?: number;
}

/**
 * Semantic markdown plus behavioral-intent sidecar (spec 2.4 addenda).
 */
export function buildSemanticSummaryBlock(
  analysis: ActivityAnalysis,
  state: ProjectState,
  topNFiles: number,
  recentEvents: WorkspaceEvent[],
  shouldIgnore?: (path: string) => boolean,
  options?: BuildSemanticSummaryOptions,
): SemanticSummaryBlock {
  const intel = buildBehaviorIntelligence(recentEvents, state, analysis, shouldIgnore);

  const lines: string[] = [];

  lines.push('Workspace intent (heuristic):');
  lines.push(intel.workspaceIntentLine);

  lines.push('');
  lines.push('Current focus area:');
  lines.push(intel.workspaceFocusLine);

  const folders = Object.entries(analysis.folderHits)
    .filter(([f]) => !shouldIgnore?.(`${f}/`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f, c]) => `- ${f}/ (${c} signals)`);
  lines.push('');
  lines.push('Most Active Areas:');
  lines.push(folders.length ? folders.join('\n') : '- (insufficient activity)');

  lines.push('');
  lines.push('Most Active Files (by focus + save events):');
  const topFilePaths = Object.entries(analysis.fileActivity)
    .filter(([f]) => !shouldIgnore?.(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, topNFiles);
  const rawPaths = topFilePaths.map(([f]) => f);
  const dedupedPaths = dedupeOrderedPaths(rawPaths);
  const tierAfter = options?.tierCompressAfter ?? 6;
  const { fullPaths, shortLabels } = tierCompressPaths(dedupedPaths, tierAfter);
  const fileLines: string[] = [];
  for (const f of fullPaths) {
    const c = analysis.fileActivity[f] ?? 0;
    fileLines.push(`- ${f} (${c})`);
  }
  if (shortLabels.length) {
    fileLines.push(`- (other active) ${shortLabels.join(', ')}`);
  }
  lines.push(fileLines.length ? fileLines.join('\n') : '- (no file events in buffer)');

  lines.push('');
  lines.push('Likely Goal:');
  lines.push(inferLikelyGoalLine(state.currentTask ?? '', dedupedPaths, intel));

  lines.push('');
  lines.push('Development Pattern:');
  lines.push(intel.developmentPattern);

  if (options?.rankingDebug?.length) {
    lines.push('');
    lines.push('Ranking pipeline (top paths, normalized blend):');
    lines.push(options.rankingDebug.join('\n\n'));
  }

  return {
    markdown: lines.join('\n'),
    intelligence: {
      likelyIntent: intel.workspaceIntentLine,
      developmentPattern: intel.developmentPattern,
      workspaceFocus: intel.workspaceFocusLine,
    },
  };
}

/** Markdown only (backward-compatible wrapper). */
export function buildSemanticSummary(
  analysis: ActivityAnalysis,
  state: ProjectState,
  topNFiles: number,
  recentEvents: WorkspaceEvent[],
  shouldIgnore?: (path: string) => boolean,
  options?: BuildSemanticSummaryOptions,
): string {
  return buildSemanticSummaryBlock(analysis, state, topNFiles, recentEvents, shouldIgnore, options).markdown;
}
