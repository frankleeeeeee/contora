import type { ProjectState } from '../../types/state';
import type { ActivityAnalysis } from './activityAnalyzer';
import type { BehavioralSignals } from './signalCollector';

/**
 * Development-behavior pattern label (rule-based inference, spec 2.4 addendum).
 */
export function detectDevelopmentPatternLabel(
  signals: BehavioralSignals,
  state: ProjectState,
  analysis: ActivityAnalysis,
): string {
  const totalSaves = signals.totalSave;
  const totalFocus = signals.totalFocus;
  const dirs = signals.uniqueTouchedDirs;
  const stagedN = state.gitStaged?.length ?? 0;
  const workingN = state.gitWorking?.length ?? 0;
  const highSaveSingle = signals.maxSaveSingleFile >= 5;
  const activeFiles = Object.keys(analysis.fileActivity).length;

  if (highSaveSingle || (totalSaves > 10 && dirs <= 2)) {
    return 'Focused debugging';
  }
  if (dirs >= 5 && stagedN + workingN > 15) {
    return 'Broad refactor';
  }
  if (stagedN >= 5 && totalSaves < 5 && stagedN >= workingN * 0.4) {
    return 'Review-oriented workflow';
  }
  if (workingN > stagedN * 1.5 && workingN >= 8 && activeFiles >= 6) {
    return 'Feature implementation';
  }
  if (totalFocus > totalSaves * 3 && totalFocus >= 8) {
    return 'Navigation-heavy exploration';
  }
  return 'General development';
}
