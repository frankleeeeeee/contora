import type { ProjectState } from '../../types/state';

/**
 * Session helpers: canonical `sessionId` still comes from `ProjectState` (`state.json`).
 * Spec 2.4 create/get/close semantics map to on-disk state and `EventStore` in this codebase.
 */
export function getCurrentSessionId(state: ProjectState): string {
  return state.sessionId ?? 'unknown';
}
