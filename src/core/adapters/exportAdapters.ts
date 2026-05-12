import type { AIMode } from '../context/modeEngine';
import type { ContextPayloadV2 } from '../schema/contextPayloadV2';
import { estimateTokens } from '../budget/tokenEstimator';
import { adaptClaude } from './claudeAdapter';
import { adaptCursorWrapped } from './cursorAdapter';
import { adaptJsonPayload } from './jsonAdapter';
import { adaptMarkdown } from './markdownAdapter';
import { adaptOpenAiMessagesJson } from './openaiAdapter';

export type ExportFormat = 'markdown' | 'cursor' | 'json' | 'claude' | 'openai';

/** Token estimate of adapter wrapper only (empty body), for export budget math. */
export function estimateExportAdapterOverheadTokens(format: ExportFormat): number {
  switch (format) {
    case 'cursor':
      return estimateTokens(adaptCursorWrapped(''));
    case 'claude':
      return estimateTokens(adaptClaude(''));
    case 'openai':
      return estimateTokens(adaptOpenAiMessagesJson(''));
    default:
      return 0;
  }
}

export function formatWithAdapter(
  format: ExportFormat,
  promptText: string,
  payload: ContextPayloadV2,
  mode: AIMode,
): string {
  void mode;
  switch (format) {
    case 'json':
      return adaptJsonPayload(payload);
    case 'cursor':
      return adaptCursorWrapped(promptText);
    case 'claude':
      return adaptClaude(promptText);
    case 'openai':
      return adaptOpenAiMessagesJson(promptText);
    case 'markdown':
    default:
      return adaptMarkdown(promptText);
  }
}

export { adaptMarkdown, normalizeExportMarkdown } from './markdownAdapter';
export { adaptCursorWrapped } from './cursorAdapter';
export { adaptJsonPayload } from './jsonAdapter';
export { adaptClaude } from './claudeAdapter';
export { adaptOpenAiMessagesJson } from './openaiAdapter';
