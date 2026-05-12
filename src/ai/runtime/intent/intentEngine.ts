import { buildIntentPromptPair, enrichPromptForProvider } from '../../../runtime';
import type { WorkspaceMemory } from '../../../core/models/workspaceMemory';
import { ProviderManager } from '../../providers/providerManager';
import { emptyWorkspaceIntent, type WorkspaceIntentAi } from './intentTypes';

export async function runWorkspaceIntentAnalysis(
  memory: WorkspaceMemory,
  providers: ProviderManager,
): Promise<WorkspaceIntentAi> {
  const top = (memory.priorityFiles ?? []).slice(0, 16).map((p) => p.path);
  const pair = buildIntentPromptPair({
    task: memory.task ?? '',
    topPaths: top,
    gitModified: memory.gitState.modified,
  });
  const enriched = enrichPromptForProvider('intent', pair);
  const raw = await providers.completeChat([
    { role: 'system', content: enriched.system },
    { role: 'user', content: enriched.user },
  ]);
  return parseIntentJson(raw);
}

function parseIntentJson(raw: string): WorkspaceIntentAi {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return emptyWorkspaceIntent();
  }
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as Partial<WorkspaceIntentAi>;
    return {
      mode: typeof o.mode === 'string' ? o.mode : 'unknown',
      focus: typeof o.focus === 'string' ? o.focus : '',
      risk: typeof o.risk === 'string' ? o.risk : '',
      activeModules: Array.isArray(o.activeModules) ? o.activeModules.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return emptyWorkspaceIntent();
  }
}
