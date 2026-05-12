import * as fs from 'fs/promises';
import * as path from 'path';
import { CONTORA_DATA_DIR, CONTORA_LEGACY_DATA_DIR } from '../constants';
import { defaultProjectState, type ProjectState } from '../types/state';

function migrateLegacy(o: Record<string, unknown>, merged: ProjectState): ProjectState {
  const legacyModified = o.gitModified;
  if (
    Array.isArray(legacyModified) &&
    legacyModified.every((x): x is string => typeof x === 'string') &&
    merged.gitWorking.length === 0 &&
    merged.gitStaged.length === 0
  ) {
    return {
      ...merged,
      gitWorking: legacyModified.map((p) => p.replace(/\\/g, '/')),
    };
  }
  return merged;
}

function parseStateObject(parsed: unknown): ProjectState | undefined {
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }
  const o = parsed as Record<string, unknown>;
  let merged: ProjectState = {
    ...defaultProjectState(),
    sessionId: typeof o.sessionId === 'string' ? o.sessionId : undefined,
    currentTask: typeof o.currentTask === 'string' ? o.currentTask : '',
    notes: typeof o.notes === 'string' ? o.notes : '',
    lastUpdated: typeof o.lastUpdated === 'number' ? o.lastUpdated : 0,
    openFiles: Array.isArray(o.openFiles) ? o.openFiles.filter((x): x is string => typeof x === 'string') : [],
    recentFiles: Array.isArray(o.recentFiles) ? o.recentFiles.filter((x): x is string => typeof x === 'string') : [],
    gitStaged: Array.isArray(o.gitStaged) ? o.gitStaged.filter((x): x is string => typeof x === 'string') : [],
    gitWorking: Array.isArray(o.gitWorking) ? o.gitWorking.filter((x): x is string => typeof x === 'string') : [],
  };
  merged = migrateLegacy(o, merged);
  return merged;
}

/** Load persisted state without VS Code APIs (MCP child process, tests). */
export async function loadProjectStateFromWorkspaceRoot(workspaceRootFsPath: string): Promise<ProjectState | undefined> {
  const tryRead = async (relDir: string): Promise<ProjectState | undefined> => {
    const fp = path.join(workspaceRootFsPath, relDir, 'state.json');
    try {
      const text = await fs.readFile(fp, 'utf8');
      return parseStateObject(JSON.parse(text) as unknown);
    } catch {
      return undefined;
    }
  };
  const primary = await tryRead(CONTORA_DATA_DIR);
  if (primary) {
    return primary;
  }
  return tryRead(CONTORA_LEGACY_DATA_DIR);
}
