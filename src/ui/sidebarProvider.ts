import * as vscode from 'vscode';
import type { EventStore } from '../core/engine/eventStore';
import { StateManager } from '../state/stateManager';
import { buildSidebarWebviewState } from './sidebarViewModel';

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

const TASK_MAX = 500;

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

    // Register message handler BEFORE assigning html. If html runs first, `ready` can be
    // posted before the listener exists and the webview never receives initial state.
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
        const task = (msg.value ?? '').slice(0, TASK_MAX);
        await this.stateManager.update(folder, { currentTask: task });
        this.events?.add({ type: 'task_update', task, timestamp: Date.now() });
        void this.pushStateToWebview();
        return;
      }
      if (msg.type === 'updateNotes') {
        await this.stateManager.update(folder, { notes: msg.value });
        this.events?.add({ type: 'note_update', note: msg.value, timestamp: Date.now() });
        void this.pushStateToWebview();
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

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.pushStateToWebview();
      }
    });

    webviewView.webview.html = this.getHtml(webviewView.webview);
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
    const ver = String((this.ctx.extension.packageJSON as { version?: string }).version ?? '');
    const payload = buildSidebarWebviewState(state, this.events, ver);
    this.view.webview.postMessage({ type: 'state', state: payload });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Math.random()).slice(2);
    const cspSource = webview.cspSource;
    const csp = [
      `default-src 'none'`,
      `style-src ${cspSource} 'unsafe-inline'`,
      `font-src ${cspSource}`,
      `img-src ${cspSource} https: data:`,
      `script-src 'nonce-${nonce}' ${cspSource}`,
    ].join('; ');
    const cspAttr = csp.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    /* Inline SVGs (currentColor) — no extra assets; icons are decorative except primary actions. */
    const svg = (paths: string, w = 14, h = 14) =>
      `<svg class="cr-ico-svg" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${paths}</svg>`;
    const ico = {
      db: svg(
        '<path d="M8 1C4.5 1 2 2.2 2 3.75v8.5C2 13.8 4.5 15 8 15s6-1.2 6-2.75v-8.5C14 2.2 11.5 1 8 1zm0 1c2.5 0 4.25.7 4.25 1.5S10.5 5 8 5 3.75 4.3 3.75 3.5 5.5 2 8 2zm4.25 10.25c0 .8-1.75 1.5-4.25 1.5s-4.25-.7-4.25-1.5V11c1.1.5 2.5.75 4.25.75s3.15-.25 4.25-.75v1.25zm0-3.25C12.15 11 10.2 12 8 12s-4.15-1-4.25-2.5V8.25C4.85 8.75 6.3 9 8 9s3.15-.25 4.25-.75V10zm0-3.25C12.15 7.75 10.2 9 8 9S3.85 7.75 3.75 6.25V5C4.85 5.5 6.3 5.75 8 5.75s3.15-.25 4.25-.75V6.75z"/>',
      ),
      copy: svg(
        '<path d="M4 1h8v2H4V1zm-1 3h9v11H3V4zm2 2v7h5V6H5zm7-4h2v9h-2V2z"/>',
      ),
      spark: svg(
        '<path d="M8 1l1.2 3.5h3.8L10.5 7l1.5 3.5L8 8.2 4 10.5 5.5 7 2.5 4.5h3.8L8 1z"/>',
        12,
        12,
      ),
      save: svg(
        '<path d="M3 1h8l2 2v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm1 2v9h6V3H4zm2 0h2v2H6V3zm-1 7h4v2H5v-2z"/>',
      ),
      history: svg(
        '<path d="M8 3.5a4.5 4.5 0 1 0 4.32 3.25h-1.1A3.5 3.5 0 1 1 8 4.5V6l2.5-2.5L8 1v2.5z"/><path d="M7.5 5h1v3l2 1.2-.5.8-2.5-1.5V5z"/>',
      ),
      camera: svg(
        '<path d="M2 4h2l1-1h6l1 1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm7 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>',
      ),
      target: svg(
        '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
      ),
      list: svg(
        '<path d="M2 3h2v2H2V3zm0 4h2v2H2V7zm0 4h2v2H2v-2zm4-8h8v2H6V3zm0 4h8v2H6V7zm0 4h8v2H6v-2z"/>',
      ),
      branch: svg(
        '<path d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 1a1.5 1.5 0 0 0-1.4 2H8a2 2 0 0 0-2 1.8V11a2 2 0 1 1-2 0V9.9A3 3 0 0 1 8 7h1.6A1.5 1.5 0 1 0 11 4zM5 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
      ),
      clock: svg(
        '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm-.5 2h1v4.2l2.5 1.5-.5.8L7 8.2V4z"/>',
      ),
      file: svg(
        '<path d="M4 1h5l3 3v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm4 1v3h3L8 2zM5 5h6v1H5V5zm0 3h6v1H5V8zm0 3h4v1H5v-1z"/>',
      ),
      check: svg(
        '<path d="M13.5 4L6 11.5 2.5 8l1-1L6 9.5 12.5 3l1 1z"/>',
      ),
      note: svg(
        '<path d="M3 1h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm6 1v3h3L9 2zM5 7h6v1H5V7zm0 3h6v1H5v-1zm0 3h4v1H5v-1z"/>',
      ),
      gear: svg(
        '<path d="M8 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm4.2 4.5l1.4.8-.3 1.6-1.6.3-.8 1.4-1.5-.6-1.5.6-.8-1.4-1.6-.3-.3-1.6 1.4-.8V8l-1.4-.8.3-1.6 1.6-.3.8-1.4 1.5.6 1.5-.6.8 1.4 1.6.3.3 1.6-1.4.8V8z"/>',
      ),
      refresh: svg(
        '<path d="M8 2.5V1l2.5 2.5L8 6V4a3.5 3.5 0 1 0 3.3 4.7h1.1A4.5 4.5 0 1 1 8 2.5z"/>',
      ),
      more: svg('<path d="M4 7h1v1H4V7zm3.5 0h1v1h-1V7zm3.5 0h1v1h-1V7z"/>'),
      bell: svg(
        '<path d="M8 1a3 3 0 0 0-3 3v2.5L4 10h8l-1-3.5V4a3 3 0 0 0-3-3zm-1 11h2a1 1 0 0 1-2 0z"/>',
      ),
      plus: svg('<path d="M8 3v5h5v1H8v5H7V9H2V8h5V3h1z"/>', 12, 12),
    };
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${cspAttr}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contora</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground, #cccccc);
      background-color: var(--vscode-sideBar-background, #252526);
      padding: 8px 10px 14px;
      margin: 0;
      line-height: 1.4;
    }
    .cr-ico-svg { display: block; flex-shrink: 0; opacity: 0.92; }
    .cr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(127,127,127,.22));
    }
    .cr-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      letter-spacing: 0.08em;
      font-size: 11px;
      color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
    }
    .cr-logo {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid var(--vscode-focusBorder, var(--vscode-foreground));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      background: linear-gradient(145deg, var(--vscode-button-background), var(--vscode-button-hoverBackground));
      color: var(--vscode-button-foreground);
      border-color: transparent;
    }
    .cr-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .cr-icon-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      color: var(--vscode-foreground);
      opacity: 0.72;
    }
    .cr-icon-pill:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
    .cr-info {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(127,127,127,.12));
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,.2));
      border-radius: 8px;
      padding: 10px 10px 10px 8px;
      margin-bottom: 12px;
    }
    .cr-info-ico {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      color: var(--vscode-textLink-foreground);
      background: var(--vscode-editor-background, rgba(0,0,0,.2));
    }
    .cr-info-ico .cr-ico-svg { width: 18px; height: 18px; }
    .cr-info-body { min-width: 0; }
    .cr-info-title { font-size: 12px; color: var(--vscode-foreground); margin: 0 0 4px; }
    .cr-info-sub { font-size: 11px; color: var(--vscode-descriptionForeground); margin: 0; }
    .cr-info code {
      font-size: 11px;
      color: var(--vscode-textPreformat-foreground);
      padding: 0 3px;
      border-radius: 3px;
      background: var(--vscode-textCodeBlock-background, rgba(127,127,127,.15));
    }
    .cr-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
    button.cr-primary {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 12px;
      font-size: var(--vscode-font-size);
      font-weight: 600;
      font-family: var(--vscode-font-family);
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(0,0,0,.12);
    }
    button.cr-primary:hover { background: var(--vscode-button-hoverBackground); }
    button.cr-primary .cr-ico-svg { opacity: 1; }
    .cr-grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    button.cr-secondary, button.cr-tertiary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-family: var(--vscode-font-family);
    }
    button.cr-secondary {
      padding: 8px 8px;
      font-size: 12px;
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 6px;
      cursor: pointer;
    }
    button.cr-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button.cr-tertiary {
      padding: 7px 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-input-background, transparent);
      border: 1px dashed var(--vscode-widget-border, rgba(127,127,127,.4));
      border-radius: 6px;
      cursor: pointer;
    }
    button.cr-tertiary:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
    }
    .cr-section {
      margin-top: 14px;
      padding-top: 2px;
    }
    .cr-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-descriptionForeground));
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .cr-section-head .cr-sec-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .cr-section-head .cr-sec-ico {
      display: flex;
      color: var(--vscode-descriptionForeground);
      opacity: 0.95;
    }
    .cr-section-head .cr-sec-ico .cr-ico-svg { width: 13px; height: 13px; }
    .cr-link-quiet {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0;
      text-transform: none;
      color: var(--vscode-textLink-foreground);
      cursor: default;
      opacity: 0.85;
    }
    .cr-task-meta { font-weight: 500; letter-spacing: 0.02em; font-size: 11px; color: var(--vscode-descriptionForeground); }
    textarea, input {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    textarea#task {
      min-height: 76px;
      resize: vertical;
      border-color: var(--vscode-focusBorder, var(--vscode-input-border));
      box-shadow: inset 0 0 0 1px rgba(0,122,204,.08);
    }
    textarea#notes { min-height: 68px; resize: vertical; margin-top: 2px; }
    .cr-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .cr-tag {
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      opacity: 0.95;
    }
    .cr-summary {
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(127,127,127,.08));
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,.18));
      border-radius: 8px;
      padding: 8px 8px 8px 6px;
    }
    .cr-sum-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      margin: 0;
      padding: 6px 4px;
      border-radius: 4px;
    }
    .cr-sum-line + .cr-sum-line { border-top: 1px solid var(--vscode-widget-border, rgba(127,127,127,.12)); }
    .cr-sum-ico {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      margin-top: 1px;
    }
    .cr-sum-ico--files { color: var(--vscode-gitDecoration-addedResourceForeground, #73c991); background: rgba(115,201,145,.12); }
    .cr-sum-ico--git { color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d); background: rgba(226,192,141,.12); }
    .cr-sum-ico--clock { color: var(--vscode-gitDecoration-untrackedResourceForeground, #75beff); background: rgba(117,190,255,.12); }
    .cr-sum-main { min-width: 0; flex: 1; }
    .cr-sum-muted { color: var(--vscode-descriptionForeground); font-size: 11px; display: block; margin-bottom: 2px; }
    .cr-sum-body { color: var(--vscode-foreground); font-size: 12px; line-height: 1.35; }
    ul.cr-file-list { padding: 4px 0 0; margin: 0; list-style: none; }
    li.file-row {
      cursor: pointer;
      margin: 0;
      padding: 5px 6px;
      font-size: 12px;
      color: var(--vscode-textLink-foreground);
      word-break: break-all;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      border-radius: 4px;
    }
    li.file-row:hover { background: var(--vscode-list-hoverBackground); text-decoration: none; }
    li.file-row .cr-file-text { text-decoration: none; }
    li.file-row:hover .cr-file-text { text-decoration: underline; }
    li.file-row .cr-file-ico { flex-shrink: 0; margin-top: 1px; color: var(--vscode-symbolIcon-fileForeground, var(--vscode-descriptionForeground)); opacity: 0.9; }
    li.muted-row {
      font-size: 12px;
      color: var(--vscode-disabledForeground);
      padding: 6px 6px;
      cursor: default;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    li.toggle-more {
      list-style: none;
      margin-top: 4px;
      padding: 4px 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
    }
    li.toggle-more:hover { text-decoration: underline; }
    details.cr-git {
      margin-top: 12px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,.18));
      border-radius: 8px;
      padding: 2px 8px 8px;
      background: var(--vscode-sideBarSectionHeader-background, transparent);
    }
    details.cr-git > summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-descriptionForeground));
      text-transform: uppercase;
      padding: 8px 4px;
      margin: 0 -4px;
      border-radius: 4px;
    }
    details.cr-git > summary::-webkit-details-marker { display: none; }
    details.cr-git > summary::before {
      content: '';
      width: 0; height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      opacity: 0.75;
      transform: rotate(-90deg);
      transition: transform 0.12s ease;
    }
    details.cr-git[open] > summary::before { transform: rotate(0deg); }
    .cr-git-sub { margin: 4px 0 8px; }
    .cr-git-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      margin: 8px 0 4px;
    }
    .cr-git-label .cr-git-ico { display: flex; opacity: 0.9; }
    .cr-notes-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      margin-bottom: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
    }
    .cr-notes-label .cr-sec-ico { display: flex; }
    footer.cr-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-widget-border, rgba(127,127,127,.25));
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .cr-local {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cr-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--vscode-testing-iconPassed, #3fb950);
      flex-shrink: 0;
    }
    .cr-footer-gear { display: flex; color: var(--vscode-descriptionForeground); opacity: 0.85; }
  </style>
</head>
<body>
  <header class="cr-header">
    <div class="cr-brand"><span class="cr-logo">C</span> CONTORA</div>
    <div class="cr-header-actions" aria-hidden="true">
      <span class="cr-icon-pill" title="Toolbar (decorative)">${ico.refresh}</span>
      <span class="cr-icon-pill" title="Toolbar (decorative)">${ico.more}</span>
      <span class="cr-icon-pill" title="Toolbar (decorative)">${ico.bell}</span>
    </div>
  </header>

  <div class="cr-info">
    <div class="cr-info-ico">${ico.db}</div>
    <div class="cr-info-body">
      <p class="cr-info-title">State is written to <code>.contora/state.json</code></p>
      <p class="cr-info-sub">Context engine · events + structured export. Lists hide <code>.contora</code>, <code>node_modules</code>, <code>dist</code>, …</p>
    </div>
  </div>

  <div class="cr-actions">
    <button type="button" class="cr-primary" id="btnExport" title="Copy structured context for your AI">
      ${ico.copy}<span>Copy AI context</span>${ico.spark}
    </button>
    <div class="cr-grid2">
      <button type="button" class="cr-secondary" id="btnSave" title="Flush state to disk">${ico.save}<span>Save now</span></button>
      <button type="button" class="cr-secondary" id="btnRestore" title="Re-open editors from last saved state">${ico.history}<span>Restore editors</span></button>
      <button type="button" class="cr-tertiary" id="btnSnap" title="Checkpoint on disk">${ico.camera}<span>Save snapshot</span></button>
      <button type="button" class="cr-tertiary" id="btnRestoreSnap" title="Restore from a checkpoint file">${ico.history}<span>Restore snapshot</span></button>
    </div>
  </div>

  <section class="cr-section">
    <div class="cr-section-head">
      <span class="cr-sec-left"><span class="cr-sec-ico">${ico.target}</span><span>Current focus</span></span>
      <span class="cr-task-meta" style="display:flex;align-items:center;gap:6px">
        <span class="cr-sec-ico" style="opacity:.45" aria-hidden="true" title="Keywords from text">${ico.plus}</span>
        <span id="taskCount">0 / ${TASK_MAX}</span>
      </span>
    </div>
    <textarea id="task" rows="3" maxlength="${TASK_MAX}" placeholder="What are you working on? (shown in exports and ranking)"></textarea>
    <div id="taskTags" class="cr-tags" aria-hidden="true"></div>
  </section>

  <section class="cr-section">
    <div class="cr-section-head">
      <span class="cr-sec-left"><span class="cr-sec-ico">${ico.spark}</span><span>Context summary</span></span>
      <span class="cr-link-quiet">More</span>
    </div>
    <div class="cr-summary">
      <div class="cr-sum-line" id="sumActive">
        <span class="cr-sum-ico cr-sum-ico--files">${ico.list}</span>
        <div class="cr-sum-main">
          <span class="cr-sum-muted">Active files</span>
          <div class="cr-sum-body" id="sumActiveBody">—</div>
        </div>
      </div>
      <div class="cr-sum-line" id="sumGit">
        <span class="cr-sum-ico cr-sum-ico--git">${ico.branch}</span>
        <div class="cr-sum-main">
          <span class="cr-sum-muted">Git changes</span>
          <div class="cr-sum-body" id="sumGitBody">—</div>
        </div>
      </div>
      <div class="cr-sum-line" id="sumActivity">
        <span class="cr-sum-ico cr-sum-ico--clock">${ico.clock}</span>
        <div class="cr-sum-main">
          <span class="cr-sum-muted">Recent activity</span>
          <div class="cr-sum-body" id="sumActivityBody">—</div>
        </div>
      </div>
    </div>
  </section>

  <section class="cr-section">
    <div class="cr-section-head">
      <span class="cr-sec-left"><span class="cr-sec-ico">${ico.file}</span><span>Active files (recent focus)</span></span>
      <span class="cr-link-quiet">More</span>
    </div>
    <ul id="recent" class="cr-file-list"></ul>
  </section>

  <details class="cr-git" open>
    <summary><span class="cr-sec-ico" style="margin-right:2px">${ico.branch}</span> Git changes</summary>
    <div class="cr-git-sub">
      <div class="cr-git-label"><span class="cr-git-ico">${ico.check}</span> Ready to commit</div>
      <ul id="gitStaged" class="cr-file-list"></ul>
    </div>
    <div class="cr-git-sub">
      <div class="cr-git-label"><span class="cr-git-ico">${ico.history}</span> Uncommitted changes</div>
      <ul id="gitWorking" class="cr-file-list"></ul>
    </div>
  </details>

  <label class="cr-notes-label" for="notes"><span class="cr-sec-ico">${ico.note}</span> Context notes</label>
  <textarea id="notes" rows="4" placeholder="Scratch notes for you or the AI (export)…"></textarea>

  <footer class="cr-footer">
    <span id="crVersion">Contora</span>
    <span class="cr-local">
      <span class="cr-dot" title="No cloud sync"></span> Local only
      <span class="cr-footer-gear" title="Settings in VS Code">${ico.gear}</span>
    </span>
  </footer>

  <template id="tpl-file-ico">${ico.file}</template>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const TASK_MAX = ${TASK_MAX};
    const taskEl = document.getElementById('task');
    const notesEl = document.getElementById('notes');
    const taskCountEl = document.getElementById('taskCount');
    const taskTagsEl = document.getElementById('taskTags');
    const recentEl = document.getElementById('recent');
    const gitStagedEl = document.getElementById('gitStaged');
    const gitWorkingEl = document.getElementById('gitWorking');
    const sumActiveBody = document.getElementById('sumActiveBody');
    const sumGitBody = document.getElementById('sumGitBody');
    const sumActivityBody = document.getElementById('sumActivityBody');
    const crVersion = document.getElementById('crVersion');
    const _tplIco = document.getElementById('tpl-file-ico');
    const fileIcoHtml = _tplIco ? _tplIco.innerHTML : '';

    function escapeHtml(t) {
      return String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    let debounce;
    function debouncePost(type, value) {
      clearTimeout(debounce);
      debounce = setTimeout(() => vscode.postMessage({ type, value }), 400);
    }

    function extractTags(text) {
      const m = text.match(/[a-zA-Z][a-zA-Z0-9_-]{2,}/g) || [];
      const stop = new Set(['the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','how','any','has','have','from','with','this','that','into','improve','your','will','just','only','also','than','then','when','what','work']);
      const seen = new Set();
      const out = [];
      for (const w of m) {
        const lw = w.toLowerCase();
        if (stop.has(lw) || seen.has(lw)) continue;
        seen.add(lw);
        out.push(lw);
        if (out.length >= 8) break;
      }
      return out;
    }

    function paintTaskMeta() {
      const n = taskEl.value.length;
      taskCountEl.textContent = n + ' / ' + TASK_MAX;
      taskTagsEl.innerHTML = '';
      for (const t of extractTags(taskEl.value)) {
        const span = document.createElement('span');
        span.className = 'cr-tag';
        span.textContent = t;
        taskTagsEl.appendChild(span);
      }
    }

    taskEl.addEventListener('input', () => {
      paintTaskMeta();
      debouncePost('updateTask', taskEl.value);
    });
    notesEl.addEventListener('input', () => debouncePost('updateNotes', notesEl.value));

    document.getElementById('btnExport').addEventListener('click', () => vscode.postMessage({ type: 'exportAIContext' }));
    document.getElementById('btnSave').addEventListener('click', () => vscode.postMessage({ type: 'saveStateNow' }));
    document.getElementById('btnRestore').addEventListener('click', () => vscode.postMessage({ type: 'restoreSession' }));
    document.getElementById('btnSnap').addEventListener('click', () => vscode.postMessage({ type: 'saveSnapshot' }));
    document.getElementById('btnRestoreSnap').addEventListener('click', () => vscode.postMessage({ type: 'restoreFromSnapshot' }));

    const LIST_CAP = 5;
    const expandState = { recent: false, staged: false, working: false };
    let lastState = null;

    function renderCollapsibleList(ul, items, sectionKey) {
      ul.innerHTML = '';
      if (!items || items.length === 0) {
        const li = document.createElement('li');
        li.className = 'muted-row';
        li.textContent = '(none)';
        ul.appendChild(li);
        return;
      }
      const expanded = expandState[sectionKey];
      const visible = expanded ? items : items.slice(0, LIST_CAP);
      for (const p of visible) {
        const li = document.createElement('li');
        li.className = 'file-row';
        li.innerHTML = '<span class="cr-file-ico">' + fileIcoHtml + '</span><span class="cr-file-text">' + escapeHtml(p) + '</span>';
        li.addEventListener('click', () => vscode.postMessage({ type: 'openFile', relativePath: p }));
        ul.appendChild(li);
      }
      if (items.length > LIST_CAP) {
        const toggle = document.createElement('li');
        toggle.className = 'toggle-more';
        toggle.textContent = expanded ? 'Show less' : 'More';
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          expandState[sectionKey] = !expandState[sectionKey];
          if (lastState) paintLists(lastState);
        });
        ul.appendChild(toggle);
      }
    }

    function paintSummary(s) {
      if (!s || !s.summary) return;
      sumActiveBody.textContent = s.summary.activeFilesLine;
      sumGitBody.textContent = s.summary.gitLine;
      sumActivityBody.textContent = s.summary.activityLine;
    }

    function paintLists(s) {
      renderCollapsibleList(recentEl, s.recentFiles || [], 'recent');
      renderCollapsibleList(gitStagedEl, s.gitStaged || [], 'staged');
      renderCollapsibleList(gitWorkingEl, s.gitWorking || [], 'working');
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
        paintTaskMeta();
        paintLists({ recentFiles: [], gitStaged: [], gitWorking: [] });
        sumActiveBody.textContent = '—';
        sumGitBody.textContent = '—';
        sumActivityBody.textContent = '—';
        crVersion.textContent = 'Contora';
        return;
      }
      lastState = s;
      taskEl.value = s.currentTask || '';
      notesEl.value = s.notes || '';
      paintTaskMeta();
      paintLists(s);
      paintSummary(s);
      crVersion.textContent = 'Contora v' + (s.extensionVersion || '?');
    });

    paintTaskMeta();
    // Defer so extension host has finished resolveWebviewView (listener + html assignment).
    setTimeout(() => vscode.postMessage({ type: 'ready' }), 0);
  </script>
</body>
</html>`;
  }
}
