import type { ProPromptPair } from './promptTypes';
/** Serializable snapshot for intent AI (no extension types). */
export interface IntentPromptInput {
    task: string;
    topPaths: readonly string[];
    gitModified: readonly string[];
}
/** Serializable snapshot for semantic summary AI. */
export interface SemanticSummaryPromptInput {
    task: string;
    notes: string;
    priorityLines: readonly string[];
    gitStaged: readonly string[];
    gitModified: readonly string[];
    heuristicBlock: string;
    recentActivityLines: readonly string[];
}
export declare function buildIntentPromptPair(input: IntentPromptInput): ProPromptPair;
export declare function buildSemanticSummaryPromptPair(input: SemanticSummaryPromptInput): ProPromptPair;
export declare function buildCompressionPromptPair(trimmedText: string): ProPromptPair;
