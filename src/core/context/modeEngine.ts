/** AI task modes (spec 2.0 / 2.1). */
export type AIMode = 'debug' | 'feature' | 'refactor' | 'review';

export class ModeEngine {
  getInstruction(mode: AIMode): string {
    switch (mode) {
      case 'debug':
        return 'Focus on identifying bugs and root cause analysis.';
      case 'feature':
        return 'Focus on implementing new functionality cleanly.';
      case 'refactor':
        return 'Focus on code structure and simplification.';
      case 'review':
        return 'Focus on code quality and potential issues.';
      default:
        return 'Focus on the workspace context provided.';
    }
  }

  /** Accept loose strings from settings / future UI. */
  normalizeMode(raw: string | undefined): AIMode {
    const m = (raw ?? 'feature').toLowerCase();
    if (m === 'debug' || m === 'feature' || m === 'refactor' || m === 'review') {
      return m;
    }
    return 'feature';
  }
}
