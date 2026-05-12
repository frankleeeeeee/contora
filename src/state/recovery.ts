import * as vscode from 'vscode';
import { CONTORA_CONFIG_SECTION } from '../constants';
import { ProjectState } from '../types/state';

function maxRestoreEditors(): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('maxRestoreEditors');
  return typeof n === 'number' && n >= 0 ? Math.min(30, n) : 8;
}

async function tryOpenRelativePath(folder: vscode.WorkspaceFolder, relativePath: string): Promise<boolean> {
  const uri = vscode.Uri.joinPath(folder.uri, relativePath);
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: true });
    return true;
  } catch {
    try {
      await vscode.commands.executeCommand('vscode.open', uri);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Open recent files from `state`; task/notes are shown in the sidebar — this module only restores editors.
 */
export async function restoreEditorsFromState(folder: vscode.WorkspaceFolder, state: ProjectState): Promise<void> {
  const max = maxRestoreEditors();
  if (max === 0) {
    return;
  }
  const ordered: string[] = [];
  for (const p of state.recentFiles) {
    if (!ordered.includes(p)) {
      ordered.push(p);
    }
  }
  for (const p of state.openFiles) {
    if (!ordered.includes(p)) {
      ordered.push(p);
    }
  }
  const slice = ordered.slice(0, max);
  for (const rel of slice) {
    await tryOpenRelativePath(folder, rel);
  }
}

