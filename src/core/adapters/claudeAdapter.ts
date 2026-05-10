/**
 * Claude-friendly framing: clear delimiter + same body as markdown export.
 */
export function adaptClaude(promptText: string): string {
  return [
    'The following is structured workspace context from Contora (VS Code extension).',
    'Use it as ground truth for paths and recent activity; verify code in the repo before claiming behavior.',
    '',
    '<<<CONTEXTRECALL>>>',
    promptText.trim(),
    '<<<END_CONTEXTRECALL>>>',
  ].join('\n');
}
