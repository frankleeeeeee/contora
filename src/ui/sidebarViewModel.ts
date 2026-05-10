import type { EventStore } from '../core/engine/eventStore';
import type { ProjectState } from '../types/state';
import { filterEngineeringPaths } from './sidebarPathFilter';

export interface SidebarSummary {
  activeFilesLine: string;
  gitLine: string;
  activityLine: string;
}

/** Shape sent to the sidebar webview (paths pre-filtered). */
export interface SidebarWebviewState {
  currentTask: string;
  notes: string;
  recentFiles: string[];
  gitStaged: string[];
  gitWorking: string[];
  summary: SidebarSummary;
  extensionVersion: string;
}

function topActivityFolder(paths: string[]): string {
  if (paths.length === 0) {
    return '—';
  }
  const counts = new Map<string, number>();
  for (const p of paths) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length === 0) {
      continue;
    }
    const key = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = '';
  let bestN = 0;
  for (const [k, v] of counts) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best || paths[0];
}

function buildSummary(
  recent: string[],
  staged: string[],
  working: string[],
  events: EventStore | undefined,
): SidebarSummary {
  const uniq = new Set<string>([...recent, ...staged, ...working]);
  const n = uniq.size;
  const top = topActivityFolder([...uniq]);
  const activeFilesLine =
    n === 0
      ? 'No engineering files in focus yet'
      : `${n} file${n === 1 ? '' : 's'} · Mostly in ${top}`;

  const st = staged.length;
  const wk = working.length;
  const gitLine =
    st === 0 && wk === 0
      ? 'No uncommitted changes in tracked paths'
      : `${st} ready to commit · ${wk} uncommitted`;

  let activityLine = 'Session events not loaded';
  if (events) {
    const ev = events.getAll();
    const nEv = ev.length;
    if (nEv === 0) {
      activityLine = 'No events recorded yet';
    } else {
      const last = ev[nEv - 1]!.timestamp;
      const mins = Math.max(0, Math.round((Date.now() - last) / 60_000));
      activityLine =
        mins === 0
          ? `Last change just now · ${nEv} event${nEv === 1 ? '' : 's'} in buffer`
          : `Last change ~${mins} min ago · ${nEv} event${nEv === 1 ? '' : 's'} in buffer`;
    }
  }

  return { activeFilesLine, gitLine, activityLine };
}

export function buildSidebarWebviewState(
  state: ProjectState,
  events: EventStore | undefined,
  extensionVersion: string,
): SidebarWebviewState {
  const recentFiles = filterEngineeringPaths(state.recentFiles ?? []);
  const gitStaged = filterEngineeringPaths(state.gitStaged ?? []);
  const gitWorking = filterEngineeringPaths(state.gitWorking ?? []);
  return {
    currentTask: state.currentTask ?? '',
    notes: state.notes ?? '',
    recentFiles,
    gitStaged,
    gitWorking,
    summary: buildSummary(recentFiles, gitStaged, gitWorking, events),
    extensionVersion,
  };
}
