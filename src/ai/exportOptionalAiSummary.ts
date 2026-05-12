import * as vscode from 'vscode';
import type { WorkspaceMemory } from '../core/models/workspaceMemory';
import type { ProviderManager } from './providers/providerManager';
import { runCloudSemanticSummary } from './runtime/semanticSummary/summaryEngine';

let lastAppendAt = 0;
let lastAppendKey = '';

export interface AppendAiExportOptions {
  enabled: boolean;
  minEvents: number;
  cooldownMs: number;
}

export function readAppendAiExportOptions(cfg: vscode.WorkspaceConfiguration): AppendAiExportOptions {
  return {
    enabled: cfg.get<boolean>('appendAiSummaryOnExport') === true,
    minEvents: Math.max(0, cfg.get<number>('appendAiSummaryMinEvents') ?? 24),
    cooldownMs: Math.max(5_000, cfg.get<number>('appendAiSummaryCooldownMs') ?? 120_000),
  };
}

/**
 * On-demand LLM summary for export only (guarded by cooldown + min events + provider on).
 */
export async function tryAppendAiSummaryOnExport(
  cfg: vscode.WorkspaceConfiguration,
  memory: WorkspaceMemory,
  heuristicMarkdown: string,
  eventCount: number,
  providers: ProviderManager,
): Promise<string | undefined> {
  const ai = readAppendAiExportOptions(cfg);
  if (!ai.enabled) {
    return undefined;
  }
  if (cfg.get<string>('aiProvider') === 'off') {
    return undefined;
  }
  if (eventCount < ai.minEvents) {
    return undefined;
  }
  const key = `${memory.sessionId}|${memory.task.length}|${eventCount}`;
  const now = Date.now();
  if (key === lastAppendKey && now - lastAppendAt < ai.cooldownMs) {
    return undefined;
  }
  try {
    const text = await runCloudSemanticSummary(memory, heuristicMarkdown, providers);
    lastAppendAt = Date.now();
    lastAppendKey = key;
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}
