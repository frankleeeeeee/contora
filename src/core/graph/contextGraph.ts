import type { WorkspaceEvent } from '../models/events';

/**
 * Spec 2.3 — lightweight co-occurrence graph: files appearing close in time are weakly linked (no AST).
 */
export function buildCooccurrenceGraph(
  events: WorkspaceEvent[],
  windowSize: number,
  shouldIgnore?: (path: string) => boolean,
): Record<string, string[]> {
  const seq: string[] = [];
  for (const e of events) {
    if (e.type !== 'file_focus' && e.type !== 'file_save') {
      continue;
    }
    if (shouldIgnore?.(e.file)) {
      continue;
    }
    seq.push(e.file);
  }
  const win = Math.max(2, Math.min(24, windowSize));
  const adj = new Map<string, Set<string>>();
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + 1; j < Math.min(seq.length, i + win); j++) {
      const a = seq[i];
      const b = seq[j];
      if (a === b) {
        continue;
      }
      if (!adj.has(a)) {
        adj.set(a, new Set());
      }
      if (!adj.has(b)) {
        adj.set(b, new Set());
      }
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    }
  }
  const sorted = [...adj.entries()].sort((x, y) => y[1].size - x[1].size).slice(0, 28);
  const out: Record<string, string[]> = {};
  for (const [k, set] of sorted) {
    out[k] = [...set].slice(0, 10);
  }
  return out;
}

export function formatContextGraphForPrompt(graph: Record<string, string[]>, maxRoots: number): string {
  const roots = Object.entries(graph).slice(0, Math.max(0, maxRoots));
  if (roots.length === 0) {
    return '';
  }
  return roots.map(([k, v]) => `- ${k} ↔ ${v.join(', ')}`).join('\n');
}
