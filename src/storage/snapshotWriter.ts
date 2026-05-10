import * as fs from 'fs/promises';
import * as path from 'path';
import { CONTORA_DATA_DIR } from '../constants';

const SNAP = 'snapshots';

/**
 * Write a plain state JSON snapshot under `.contora/snapshots/` (legacy helper).
 */
export async function writeStateSnapshot(workspaceRootFsPath: string, stateJson: string): Promise<string> {
  const dir = path.join(workspaceRootFsPath, CONTORA_DATA_DIR, SNAP);
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `state-${stamp}.json`;
  const fp = path.join(dir, fileName);
  await fs.writeFile(fp, stateJson, 'utf8');
  return fp;
}
