import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';

export const CHECKPOINT_VERSION = 1 as const;

export interface CheckpointV1 {
  version: typeof CHECKPOINT_VERSION;
  savedAt: number;
  sessionId: string;
  state: ProjectState;
  /** Tail of in-memory ring buffer at snapshot time (replay / diff aid) */
  eventsTail?: WorkspaceEvent[];
}

export function buildCheckpoint(state: ProjectState, eventsTail: readonly WorkspaceEvent[]): CheckpointV1 {
  return {
    version: CHECKPOINT_VERSION,
    savedAt: Date.now(),
    sessionId: state.sessionId ?? 'unknown',
    state: { ...state },
    eventsTail: eventsTail.length ? [...eventsTail] : undefined,
  };
}
