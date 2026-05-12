import { rankingScoreMultiplier } from '../../runtime';
import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import type { ModeStrategy } from '../modes/modeStrategy';
import { RANKING_FACTORS } from './rankingFactors';

export function taskKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/g)
    .filter((w) => w.length >= 2)
    .slice(0, 12);
}

/** Raw per-dimension signal strength for one path (matches `RANKING_FACTORS`; used for normalization / debug). */
export interface PathScoreRaw {
  path: string;
  gitStaged: number;
  gitWorking: number;
  openTab: number;
  workingSetRecency: number;
  focusCount: number;
  saveCount: number;
  taskKeyword: number;
}

export function getPathScoreRaw(file: string, state: ProjectState, events: WorkspaceEvent[]): PathScoreRaw {
  const f = RANKING_FACTORS;
  const staged = new Set(state.gitStaged ?? []);
  const working = new Set(state.gitWorking ?? []);
  const open = new Set(state.openFiles ?? []);
  const recent = state.recentFiles ?? [];
  const ri = recent.indexOf(file);
  let focus = 0;
  let save = 0;
  for (const e of events) {
    if (e.type === 'file_focus' && e.file === file) {
      focus++;
    }
    if (e.type === 'file_save' && e.file === file) {
      save++;
    }
  }
  let taskKeyword = 0;
  const kw = taskKeywords(state.currentTask ?? '');
  const lower = file.toLowerCase();
  for (const k of kw) {
    if (lower.includes(k)) {
      taskKeyword = f.taskKeywordHit;
      break;
    }
  }
  return {
    path: file,
    gitStaged: staged.has(file) ? f.gitStagedPresence : 0,
    gitWorking: working.has(file) ? f.gitWorkingPresence : 0,
    openTab: open.has(file) ? f.openTabPresence : 0,
    workingSetRecency: ri >= 0 ? Math.max(1, f.workingSetRecencyMax - ri) : 0,
    focusCount: focus * f.perFocusUnit,
    saveCount: save * f.perSaveUnit,
    taskKeyword,
  };
}

export function scorePath(
  file: string,
  state: ProjectState,
  events: WorkspaceEvent[],
  strategy: ModeStrategy,
): number {
  const r = getPathScoreRaw(file, state, events);
  const w = strategy.weights;
  const base =
    w.gitStaged * r.gitStaged +
    w.gitWorking * r.gitWorking +
    w.openTab * r.openTab +
    w.workingSetRecency * r.workingSetRecency +
    w.focus * r.focusCount +
    w.save * r.saveCount +
    w.taskKeyword * r.taskKeyword;
  return base * rankingScoreMultiplier(file);
}
