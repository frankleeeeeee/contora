/**
 * Single user message JSON (stringified) for Chat Completions-style APIs.
 */
export function adaptOpenAiMessagesJson(promptText: string): string {
  return JSON.stringify(
    {
      messages: [{ role: 'user', content: promptText }],
    },
    null,
    2,
  );
}
