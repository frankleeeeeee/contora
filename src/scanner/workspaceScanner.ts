import * as vscode from 'vscode';
import { CONTORA_CONFIG_SECTION } from '../constants';
import type { EventStore } from '../core/engine/eventStore';
import { StateManager } from '../state/stateManager';
import { scanGitState } from './gitScanner';

function workingSetCap(): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('workingSetMaxFiles');
  return typeof n === 'number' && n > 0 ? Math.min(200, n) : 40;
}

function asRelativePath(uri: vscode.Uri, folder: vscode.WorkspaceFolder): string | undefined {
  if (uri.scheme !== 'file') {
    return undefined;
  }
  const owner = vscode.workspace.getWorkspaceFolder(uri);
  if (!owner || owner.uri.toString() !== folder.uri.toString()) {
    return undefined;
  }
  const rel = vscode.workspace.asRelativePath(uri, false);
  if (!rel || rel === uri.fsPath) {
    return undefined;
  }
  return rel.replace(/\\/g, '/');
}

function pushFrontUnique(list: string[], item: string, cap: number): string[] {
  const next = [item, ...list.filter((x) => x !== item)];
  return next.slice(0, cap);
}

function collectOpenTabRelativePaths(folder: vscode.WorkspaceFolder): string[] {
  const cap = workingSetCap();
  const out: string[] = [];
  const groups = vscode.window.tabGroups?.all ?? [];
  for (const g of groups) {
    for (const tab of g.tabs) {
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        const rel = asRelativePath(input.uri, folder);
        if (rel) {
          out.push(rel);
        }
      } else if (input instanceof vscode.TabInputTextDiff) {
        const rel = asRelativePath(input.modified, folder);
        if (rel) {
          out.push(rel);
        }
      }
    }
  }
  return [...new Set(out)].slice(0, cap);
}

export class WorkspaceScanner {
  private disposables: vscode.Disposable[] = [];
  private gitTimer: ReturnType<typeof setTimeout> | undefined;
  private lastGitSig = '';

  constructor(
    private readonly folder: vscode.WorkspaceFolder,
    private readonly state: StateManager,
    private readonly events?: EventStore,
    private readonly onAfterPersist?: () => void,
  ) {}

  flushNow(): Thenable<void> {
    return this.persist(undefined, undefined);
  }

  private async persist(touchRelative?: string, kind?: 'focus' | 'save'): Promise<void> {
    const folder = this.folder;
    const cap = workingSetCap();
    const openFiles = collectOpenTabRelativePaths(folder);
    let recent = this.state.getCached(folder)?.recentFiles ?? [];
    if (touchRelative) {
      recent = pushFrontUnique(recent, touchRelative, cap);
    }

    if (touchRelative && kind === 'focus') {
      this.events?.add({ type: 'file_focus', file: touchRelative, timestamp: Date.now() });
    }
    if (touchRelative && kind === 'save') {
      this.events?.add({ type: 'file_save', file: touchRelative, timestamp: Date.now() });
    }

    const gs = await scanGitState(folder.uri.fsPath);
    const sig = JSON.stringify(gs);
    if (sig !== this.lastGitSig) {
      this.lastGitSig = sig;
      this.events?.add({
        type: 'git_change',
        modified: gs.working,
        staged: gs.staged,
        timestamp: Date.now(),
      });
    }

    await this.state.update(folder, {
      openFiles,
      recentFiles: recent,
      gitStaged: gs.staged,
      gitWorking: gs.working,
    });
    this.onAfterPersist?.();
  }

  start(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((ed) => {
        if (!ed?.document) {
          return;
        }
        const rel = asRelativePath(ed.document.uri, this.folder);
        if (!rel) {
          return;
        }
        void this.persist(rel, 'focus');
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const rel = asRelativePath(doc.uri, this.folder);
        if (!rel) {
          return;
        }
        void this.persist(rel, 'save');
      }),
    );

    this.disposables.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        void this.persist();
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument(() => {
        void this.persist();
      }),
    );

    void this.persist();

    this.gitTimer = setInterval(() => {
      void this.persist();
    }, 60_000);
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    if (this.gitTimer) {
      clearInterval(this.gitTimer);
      this.gitTimer = undefined;
    }
  }
}
