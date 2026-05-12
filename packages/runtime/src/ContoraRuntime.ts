import type {
  ContextItem,
  IntentResult,
  PromptInput,
  RuntimeInput,
  RuntimeProvider,
} from './core/interfaces';

/**
 * Default {@link RuntimeProvider} for Contora: intent stub, score-based ordering, bounded compression.
 */
export class ContoraRuntime implements RuntimeProvider {
  buildIntent(_input: RuntimeInput): IntentResult {
    return { type: 'contora-general', confidence: 0.62 };
  }

  rankContext(context: ContextItem[]): ContextItem[] {
    return [...context].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  compressContext(context: ContextItem[]): ContextItem[] {
    return context.slice(0, 8);
  }

  buildPrompt(data: PromptInput): string {
    const body = data.context.map((c) => c.content).join('\n');
    return [`[Contora] intent=${data.intent.type}`, `mode=${data.mode}`, body].join('\n\n');
  }
}
