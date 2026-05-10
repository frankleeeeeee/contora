import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import type { ActivityAnalysis } from './activityAnalyzer';
import { detectDevelopmentPatternLabel } from './patternDetector';
import { collectBehavioralSignals, type BehavioralSignals } from './signalCollector';
import { inferWorkspaceIntentLine } from './workspaceIntent';
import { formatWorkspaceFocusLine } from '../focus/workspaceFocus';

export interface BehaviorIntelligence {
  signals: BehavioralSignals;
  developmentPattern: string;
  workspaceIntentLine: string;
  workspaceFocusLine: string;
}

/**
 * Behavior → pattern + intent + hotspot (facade entry, spec 2.4 addendum 2).
 */
export function buildBehaviorIntelligence(
  events: WorkspaceEvent[],
  state: ProjectState,
  analysis: ActivityAnalysis,
  shouldIgnore?: (p: string) => boolean,
): BehaviorIntelligence {
  const signals = collectBehavioralSignals(events, state, shouldIgnore);
  return {
    signals,
    developmentPattern: detectDevelopmentPatternLabel(signals, state, analysis),
    workspaceIntentLine: inferWorkspaceIntentLine(signals, state.currentTask ?? '', analysis, state),
    workspaceFocusLine: formatWorkspaceFocusLine(signals.directoryWeights, 2),
  };
}
