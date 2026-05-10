import * as fs from 'fs/promises';
import * as path from 'path';
import { CONTORA_DATA_DIR, CONTORA_LEGACY_DATA_DIR } from '../../constants';
import type { ProjectState } from '../../types/state';
import type { WorkspaceEvent } from '../models/events';
import type { CheckpointV1 } from './checkpointBuilder';

const SNAP = 'snapshots';

function snapshotsDir(workspaceRootFsPath: string, dataRel: string): string {
  return path.join(workspaceRootFsPath, dataRel, SNAP);
}

async function listSnapshotsInDir(dir: string): Promise<SnapshotListEntry[]> {
  try {
    const names = await fs.readdir(dir);
    const jsons = names.filter((n) => n.endsWith('.json'));
    const out: SnapshotListEntry[] = [];
    for (const fileName of jsons) {
      const fsPath = path.join(dir, fileName);
      const st = await fs.stat(fsPath);
      out.push({ fileName, fsPath, mtimeMs: st.mtimeMs });
    }
    return out;
  } catch {
    return [];
  }
}

export async function writeCheckpointFile(
  workspaceRootFsPath: string,
  checkpoint: CheckpointV1,
): Promise<string> {
  const dir = snapshotsDir(workspaceRootFsPath, CONTORA_DATA_DIR);
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `checkpoint-${stamp}.json`;
  const fp = path.join(dir, fileName);
  await fs.writeFile(fp, JSON.stringify(checkpoint, null, 2), 'utf8');
  return fp;
}

export interface SnapshotListEntry {
  fileName: string;
  fsPath: string;
  mtimeMs: number;
}

export async function listSnapshots(workspaceRootFsPath: string): Promise<SnapshotListEntry[]> {
  const primary = snapshotsDir(workspaceRootFsPath, CONTORA_DATA_DIR);
  const legacy = snapshotsDir(workspaceRootFsPath, CONTORA_LEGACY_DATA_DIR);
  const merged = [...(await listSnapshotsInDir(primary)), ...(await listSnapshotsInDir(legacy))];
  merged.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return merged;
}

export interface RestoredCheckpoint {
  state: ProjectState;
  eventsTail?: WorkspaceEvent[];
}

/**
 * Read snapshot: supports v1 checkpoint and legacy plain-`ProjectState` JSON files.
 */
export async function readCheckpointForRestore(fsPath: string): Promise<RestoredCheckpoint | undefined> {
  let raw: string;
  try {
    raw = await fs.readFile(fsPath, 'utf8');
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }
  const o = parsed as Record<string, unknown>;
  if (o.version === 1 && o.state && typeof o.state === 'object') {
    const tail = o.eventsTail;
    const eventsTail = Array.isArray(tail) ? (tail as WorkspaceEvent[]) : undefined;
    return { state: o.state as ProjectState, eventsTail };
  }
  return { state: parsed as ProjectState };
}
