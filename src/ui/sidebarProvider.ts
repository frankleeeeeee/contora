import * as vscode from 'vscode';
import type { EventStore } from '../core/engine/eventStore';
import { StateManager } from '../state/stateManager';

type WebviewToExt =
  | { type: 'ready' }
  | { type: 'exportAIContext' }
  | { type: 'saveStateNow' }
  | { type: 'restoreSession' }
  | { type: 'saveSnapshot' }
  | { type: 'restoreFromSnapshot' }
  | { type: 'updateTask'; value: string }
  | { type: 'updateNotes'; value: string }
  | { type: 'openFile'; relativePath: string };

export class ContoraSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'contora.sidebar';

  private view?: vscode.WebviewView;
  private folder: vscode.WorkspaceFolder | undefined;
  private events?: EventStore;

  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly stateManager: StateManager,
    events?: EventStore,
  ) {
    this.events = events;
  }

  setEventStore(store: EventStore | undefined): void {
    this.events = store;
  }

  setWorkspaceFolder(folder: vscode.WorkspaceFolder | undefined): void {
    this.folder = folder;
    void this.pushStateToWebview();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg: WebviewToExt) => {
      if (msg.type === 'ready') {
        await this.pushStateToWebview();
        return;
      }
      if (msg.type === 'exportAIContext') {
        await vscode.commands.executeCommand('contora.exportAIContext');
        return;
      }
      if (msg.type === 'saveStateNow') {
        await vscode.commands.executeCommand('contora.saveStateNow');
        return;
      }
      if (msg.type === 'restoreSession') {
        await vscode.commands.executeCommand('contora.restoreSession');
        return;
      }
      if (msg.type === 'saveSnapshot') {
        await vscode.commands.executeCommand('contora.saveSnapshot');
        return;
      }
      if (msg.type === 'restoreFromSnapshot') {
        await vscode.commands.executeCommand('contora.restoreFromSnapshot');
        return;
      }
      const folder = this.folder ?? this.stateManager.getPrimaryFolder();
      if (!folder) {
        vscode.window.showWarningMessage('Contora: Open a folder workspace first.');
        return;
      }
      if (msg.type === 'updateTask') {
        await this.stateManager.update(folder, { currentTask: msg.value });
        this.events?.add({ type: 'task_update', task: msg.value, timestamp: Date.now() });
        return;
      }
      if (msg.type === 'updateNotes') {
        await this.stateManager.update(folder, { notes: msg.value });
        this.events?.add({ type: 'note_update', note: msg.value, timestamp: Date.now() });
        return;
      }
      if (msg.type === 'openFile') {
        const uri = vscode.Uri.joinPath(folder.uri, msg.relativePath);
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
        } catch {
          await vscode.commands.executeCommand('vscode.open', uri);
        }
      }
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
    });
  }

  async refresh(): Promise<void> {
    await this.pushStateToWebview();
  }

  private async pushStateToWebview(): Promise<void> {
    if (!this.view) {
      return;
    }
    const folder = this.folder ?? this.stateManager.getPrimaryFolder();
    if (!folder) {
      this.view.webview.postMessage({ type: 'state', state: null });
      return;
    }
    const state = await this.stateManager.load(folder);
    this.view.webview.postMessage({ type: 'state', state });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Math.random()).slice(2);
    const cspSource = webview.cspSource;
    const csp = [
      `default-src 'none'`,
      `style-src ${cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' ${cspSource}`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contora</title>
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px; }
    label { display: block; margin-top: 10px; font-weight: 600; }
    textarea, input { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 6px; }
    textarea { min-height: 72px; resize: vertical; }
    ul { padding-left: 18px; margin: 6px 0 0; }
    li { cursor: pointer; margin: 4px 0; color: var(--vscode-textLink-foreground); }
    li:hover { text-decoration: underline; }
    .muted { opacity: 0.75; font-size: 0.9em; margin-top: 8px; }
    .section { margin-top: 12px; }
    code { font-size: 0.92em; }
    li.toggle-more { list-style: none; margin-left: -18px; margin-top: 6px; font-weight: 600; }
    li.toggle-more:hover { text-decoration: underline; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 4px; }
    .actions button {
      flex: 1 1 auto;
      min-width: 0;
      padding: 6px 8px;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      cursor: pointer;
    }
    .actions button:hover { background: var(--vscode-button-hoverBackground); }
    .actions button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    .actions button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <div class="muted">State is written to <code>.contora/state.json</code> · Context engine (events + structured export)</div>
  <div class="actions">
    <button type="button" id="btnExport" title="Copy AI context to clipboard (same as Command Palette: Export AI context)">Copy AI context</button>
    <button type="button" class="secondary" id="btnSave" title="Flush state to disk now">Save now</button>
    <button type="button" class="secondary" id="btnRestore" title="Re-open editors from last saved state">Restore editors</button>
    <button type="button" class="secondary" id="btnSnap" title="Checkpoint: state + event tail → .contora/snapshots/checkpoint-*.json">Save snapshot</button>
    <button type="button" class="secondary" id="btnRestoreSnap" title="Pick a snapshot; restore state and merge events">Restore snapshot</button>
  </div>
  <label for="task">Current task</label>
  <textarea id="task" rows="3" placeholder="e.g. Refactor payment retry…"></textarea>

  <div class="section">
    <label>Working set (recent focus / save)</label>
    <ul id="recent"></ul>
  </div>

  <div class="section">
    <label>Git · staged</label>
    <ul id="gitStaged"></ul>
  </div>

  <div class="section">
    <label>Git · working tree</label>
    <ul id="gitWorking"></ul>
  </div>

  <label for="notes">Notes</label>
  <textarea id="notes" rows="5" placeholder="Notes for your next session or for AI…"></textarea>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const taskEl = document.getElementById('task');
    const notesEl = document.getElementById('notes');
    const recentEl = document.getElementById('recent');
    const gitStagedEl = document.getElementById('gitStaged');
    const gitWorkingEl = document.getElementById('gitWorking');

    let debounce;

    function debouncePost(type, value) {
      clearTimeout(debounce);
      debounce = setTimeout(() => vscode.postMessage({ type, value }), 400);
    }

    taskEl.addEventListener('input', () => debouncePost('updateTask', taskEl.value));
    notesEl.addEventListener('input', () => debouncePost('updateNotes', notesEl.value));

    document.getElementById('btnExport').addEventListener('click', () => vscode.postMessage({ type: 'exportAIContext' }));
    document.getElementById('btnSave').addEventListener('click', () => vscode.postMessage({ type: 'saveStateNow' }));
    document.getElementById('btnRestore').addEventListener('click', () => vscode.postMessage({ type: 'restoreSession' }));
    document.getElementById('btnSnap').addEventListener('click', () => vscode.postMessage({ type: 'saveSnapshot' }));
    document.getElementById('btnRestoreSnap').addEventListener('click', () => vscode.postMessage({ type: 'restoreFromSnapshot' }));

    const LIST_CAP = 5;
    const expandState = { recent: false, staged: false, working: false };
    let lastState = null;

    function renderCollapsibleList(ul, items, msgType, sectionKey) {
      ul.innerHTML = '';
      if (!items || items.length === 0) {
        const li = document.createElement('li');
        li.textContent = '(none)';
        li.style.cursor = 'default';
        li.style.color = 'var(--vscode-disabledForeground)';
        li.style.textDecoration = 'none';
        ul.appendChild(li);
        return;
      }
      const expanded = expandState[sectionKey];
      const visible = expanded ? items : items.slice(0, LIST_CAP);
      for (const p of visible) {
        const li = document.createElement('li');
        li.textContent = p;
        li.addEventListener('click', () => vscode.postMessage({ type: msgType, relativePath: p }));
        ul.appendChild(li);
      }
      if (items.length > LIST_CAP) {
        const toggle = document.createElement('li');
        toggle.className = 'toggle-more';
        toggle.textContent = expanded ? 'Show less' : 'More';
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          expandState[sectionKey] = !expandState[sectionKey];
          if (lastState) {
            paintLists(lastState);
          }
        });
        ul.appendChild(toggle);
      }
    }

    function paintLists(s) {
      renderCollapsibleList(recentEl, s.recentFiles || [], 'openFile', 'recent');
      renderCollapsibleList(gitStagedEl, s.gitStaged || [], 'openFile', 'staged');
      renderCollapsibleList(gitWorkingEl, s.gitWorking || [], 'openFile', 'working');
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.type !== 'state') return;
      const s = msg.state;
      if (!s) {
        lastState = null;
        expandState.recent = false;
        expandState.staged = false;
        expandState.working = false;
        taskEl.value = '';
        notesEl.value = '';
        paintLists({ recentFiles: [], gitStaged: [], gitWorking: [] });
        return;
      }
      lastState = s;
      taskEl.value = s.currentTask || '';
      notesEl.value = s.notes || '';
      paintLists(s);
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}
