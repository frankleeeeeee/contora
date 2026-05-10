/**
 * Heuristic export quality score and warnings (spec 2.4 addendum).
 */
export interface ContextQualityResult {
  score: number;
  warnings: string[];
}

export function analyzeContextQuality(input: {
  estimatedSemanticTokens: number;
  exportTokenBudget: number;
  priorityPathCount: number;
  duplicatePathCount: number;
  eventCount: number;
  /** 0–1 rough ratio of low-value events vs buffer size */
  lowSignalRatio?: number;
}): ContextQualityResult {
  let score = 88;
  const warnings: string[] = [];

  if (input.exportTokenBudget > 0 && input.estimatedSemanticTokens > input.exportTokenBudget * 0.95) {
    score -= 12;
    warnings.push('Semantic + summary block is close to or over export token budget.');
  }
  if (input.duplicatePathCount >= 3) {
    score -= 8;
    warnings.push('Duplicate file references detected across lists.');
  }
  if (input.priorityPathCount > 28) {
    score -= 6;
    warnings.push('Very large priority file set — consider lowering maxPriorityFiles or raising ignore coverage.');
  }
  if (input.eventCount > 400) {
    score -= 4;
    warnings.push('High event volume in buffer — ranking may be noisy.');
  }
  if (input.lowSignalRatio !== undefined && input.lowSignalRatio > 0.55) {
    score -= 10;
    warnings.push('Many low-signal events vs actionable file signals.');
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), warnings };
}
