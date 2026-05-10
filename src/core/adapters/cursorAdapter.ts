export function adaptCursorWrapped(promptText: string): string {
  return `// CONTEXTRECALL CONTEXT START\n${promptText}\n// CONTEXTRECALL CONTEXT END`;
}
