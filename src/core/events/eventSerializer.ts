import type { WorkspaceEvent } from '../models/events';

/** Stable JSONL line for append-only event log (spec 2.4). */
export function serializeEventLine(event: WorkspaceEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseEventLine(line: string): WorkspaceEvent | undefined {
  const t = line.trim();
  if (!t) {
    return undefined;
  }
  try {
    return JSON.parse(t) as WorkspaceEvent;
  } catch {
    return undefined;
  }
}
