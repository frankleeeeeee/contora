import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import type { WorkspaceMemory } from '../models/workspaceMemory';

function uniq(paths: string[]): string[] {
  return [...new Set(paths)];
}

/**
 * Builds WorkspaceMemory from persisted ProjectState + optional recent event tail.
 * Aligns with 2.1 MemoryBuilder responsibilities without dropping disk-backed fields.
 */
export class MemoryBuilder {
  build(state: ProjectState, recentEvents: WorkspaceEvent[], sessionId: string): WorkspaceMemory {
    const staged = state.gitStaged ?? [];
    const working = state.gitWorking ?? [];
    return {
      sessionId,
      task: state.currentTask ?? '',
      workingFiles: uniq(state.recentFiles ?? []),
      openFiles: uniq(state.openFiles ?? []),
      gitState: {
        staged: uniq(staged),
        modified: uniq(working),
      },
      notes: state.notes ?? '',
      recentEvents,
    };
  }
}
