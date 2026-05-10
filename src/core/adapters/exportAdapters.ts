import type { AIMode } from '../context/modeEngine';
import type { ContextPayloadV2 } from '../schema/contextPayloadV2';
import { adaptClaude } from './claudeAdapter';
import { adaptCursorWrapped } from './cursorAdapter';
import { adaptJsonPayload } from './jsonAdapter';
import { adaptMarkdown } from './markdownAdapter';
import { adaptMcpEnvelope } from './mcpAdapter';
import { adaptOpenAiMessagesJson } from './openaiAdapter';

export type ExportFormat = 'markdown' | 'cursor' | 'json' | 'claude' | 'openai' | 'mcp';

export function formatWithAdapter(
  format: ExportFormat,
  promptText: string,
  payload: ContextPayloadV2,
  mode: AIMode,
): string {
  switch (format) {
    case 'json':
      return adaptJsonPayload(payload);
    case 'cursor':
      return adaptCursorWrapped(promptText);
    case 'claude':
      return adaptClaude(promptText);
    case 'openai':
      return adaptOpenAiMessagesJson(promptText);
    case 'mcp':
      return adaptMcpEnvelope(mode, payload);
    case 'markdown':
    default:
      return adaptMarkdown(promptText);
  }
}

export { adaptMarkdown, adaptCursorWrapped, adaptJsonPayload, adaptClaude, adaptOpenAiMessagesJson, adaptMcpEnvelope };
