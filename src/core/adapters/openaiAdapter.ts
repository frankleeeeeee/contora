import { normalizeExportMarkdown } from './markdownAdapter';

/**
 * Single user message JSON (stringified) for Chat Completions-style APIs.
 * Content is normalized (newlines / NUL) so long markdown + fences stringify safely.
 */
export function adaptOpenAiMessagesJson(promptText: string): string {
  const content = normalizeExportMarkdown(promptText);
  return JSON.stringify(
    {
      messages: [{ role: 'user', content }],
    },
    null,
    2,
  );
}
