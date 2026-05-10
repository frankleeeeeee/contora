import type { RankedPath } from '../ranking/contextRanker';
import { estimateTokens } from './tokenEstimator';

/**
 * When token budget is tight, shrink how many priority lines we keep (~12 tokens per path line, heuristic).
 */
export function shrinkRankedForBudget(ranked: RankedPath[], maxLinesBudget: number): RankedPath[] {
  const perLine = 12;
  const maxLines = Math.max(3, Math.floor(maxLinesBudget / perLine));
  return ranked.slice(0, Math.min(ranked.length, maxLines));
}

export function budgetAllowsFullExport(estimatedPromptTokens: number, budget: number): boolean {
  if (budget <= 0) {
    return true;
  }
  return estimatedPromptTokens <= budget;
}

export interface AllocateOptions {
  /** Generated semantic summary markdown */
  semanticMarkdown?: string;
  /** Graph / extra block text */
  graphMarkdown?: string;
  /** Rough token reserve for TASK / GIT blocks */
  reservedOverhead?: number;
}

export interface AllocateResult {
  priorityItems: RankedPath[];
  /** Estimated tokens for semantic + graph + overhead */
  reservedTokens: number;
  /** Token budget left for the priority list (before shrink) */
  availableForRanked: number;
}

/**
 * Keep a prefix of `ranked` under a fixed token budget (spec 2.4 — `allocate`).
 * If `maxTokens <= 0`, returns the full ranked list unchanged.
 */
export function allocate(
  ranked: RankedPath[],
  maxTokens: number,
  options?: AllocateOptions,
): AllocateResult {
  if (maxTokens <= 0) {
    return {
      priorityItems: ranked,
      reservedTokens: 0,
      availableForRanked: maxTokens,
    };
  }
  const sem = estimateTokens(options?.semanticMarkdown ?? '');
  const graph = estimateTokens(options?.graphMarkdown ?? '');
  const overhead = typeof options?.reservedOverhead === 'number' ? options.reservedOverhead : 400;
  const reserved = sem + graph + Math.max(0, overhead);
  const available = Math.max(0, maxTokens - reserved);
  const shrunk = shrinkRankedForBudget(ranked, available);
  return {
    priorityItems: shrunk,
    reservedTokens: reserved,
    availableForRanked: available,
  };
}
