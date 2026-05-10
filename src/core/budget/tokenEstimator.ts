/** Rough token estimate (spec 2.3): ~ chars / 4, for budget trimming. */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}
