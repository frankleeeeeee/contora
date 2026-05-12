import { buildCompressionPromptPair, enrichPromptForProvider } from '../../../runtime';
import { trimStringToTokenBudget } from '../../../core/budget/contextTrimmer';
import { ProviderManager } from '../../providers/providerManager';

export interface CompressionInput {
  text: string;
  approxTokenBudget: number;
}

/**
 * First pass: deterministic trim (open core). Optional second pass: LLM rewrite (BYOK).
 */
export async function compressContextText(
  input: CompressionInput,
  providers: ProviderManager,
  useAiSecondPass: boolean,
): Promise<string> {
  let t =
    input.approxTokenBudget > 0
      ? trimStringToTokenBudget(input.text, input.approxTokenBudget)
      : input.text;
  if (!useAiSecondPass) {
    return t;
  }
  const pair = buildCompressionPromptPair(t);
  const enriched = enrichPromptForProvider('compression', pair);
  const out = await providers.completeChat([
    { role: 'system', content: enriched.system },
    { role: 'user', content: enriched.user },
  ]);
  return out.trim() || t;
}
