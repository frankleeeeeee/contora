import * as vscode from 'vscode';
import {
  ContextBuilder,
  EventStore,
  MemoryBuilder,
  ModeEngine,
  allocate,
  analyzeActivity,
  analyzeContextQuality,
  buildContextPayloadV2,
  buildSemanticSummaryBlock,
  countDuplicatePaths,
  formatWithAdapter,
  getModeStrategy,
  listIgnoredPathIssues,
  rankContextFilesWithDebug,
  trimContextPayloadForBudget,
  trimStringToTokenBudget,
  estimateExportAdapterOverheadTokens,
  estimateTokens,
  type ExportFormat,
} from './core';
import type { WorkspaceMemory } from './core/models/workspaceMemory';
import { IgnoreMatcher, shouldIgnoreWorkspacePath } from './core/ignore/ignoreMatcher';
import { appendEventJsonl, EventLog } from './core/events/eventLog';
import { WorkspaceScanner } from './scanner/workspaceScanner';
import { StateManager } from './state/stateManager';
import { restoreEditorsFromState } from './state/recovery';
import { writeLatestMemoryJson } from './storage/memoryWriter';
import { CONTORA_CONFIG_SECTION, CONTORA_IGNORE_FILE, CONTORA_LEGACY_IGNORE_FILE } from './constants';
import { ContoraSidebarProvider } from './ui/sidebarProvider';
import { ContoraKeyManager } from './ai/auth/keyManager';
import { tryAppendAiSummaryOnExport } from './ai/exportOptionalAiSummary';
import { ProviderManager } from './ai/providers/providerManager';
import { registerPhase3AiRuntime } from './ai/registerPhase3';

let scanners: WorkspaceScanner[] = [];
let workspaceIgnoreMatcher: IgnoreMatcher | undefined;
const ignoreDisposables: vscode.Disposable[] = [];

function disposeScanners(): void {
  for (const s of scanners) {
    s.dispose();
  }
  scanners = [];
}

function disposeIgnoreWatchers(): void {
  for (const d of ignoreDisposables) {
    d.dispose();
  }
  ignoreDisposables.length = 0;
}

function eventBufferCap(): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('maxEventBuffer');
  return typeof n === 'number' && n >= 20 ? Math.min(5000, n) : 200;
}

function eventsInPrompt(): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('eventsInPrompt');
  return typeof n === 'number' && n >= 0 ? Math.min(200, n) : 50;
}

function readExportFormat(): ExportFormat {
  const raw = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<string>('exportFormat');
  if (raw === 'mcp') {
    return 'markdown';
  }
  if (
    raw === 'json' ||
    raw === 'cursor' ||
    raw === 'markdown' ||
    raw === 'claude' ||
    raw === 'openai'
  ) {
    return raw;
  }
  return 'markdown';
}

function maxPriorityFilesCap(strategyMax: number): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('maxPriorityFiles');
  const cap = typeof n === 'number' && n >= 1 ? Math.min(40, n) : 12;
  return Math.min(cap, strategyMax);
}

function exportTokenBudget(): number {
  const n = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<number>('exportTokenBudget');
  if (typeof n !== 'number' || n <= 0) {
    return 0;
  }
  return Math.min(200_000, Math.max(500, n));
}

function mergeDiskEventLogEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<boolean>('mergeDiskEventLog') !== false;
}

function writeLatestMemoryOnSaveEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<boolean>('writeLatestMemoryOnSave') !== false;
}

function applyIgnoreToMemory(memory: WorkspaceMemory, ig: (p: string) => boolean): void {
  memory.workingFiles = memory.workingFiles.filter((f) => !ig(f));
  memory.openFiles = memory.openFiles.filter((f) => !ig(f));
  memory.gitState.staged = memory.gitState.staged.filter((f) => !ig(f));
  memory.gitState.modified = memory.gitState.modified.filter((f) => !ig(f));
  memory.recentEvents = memory.recentEvents.filter((e) => {
    if (e.type === 'file_focus' || e.type === 'file_save') {
      return !ig(e.file);
    }
    return true;
  });
}

let globalEventStore: EventStore | undefined;

function createEventStore(stateManager: StateManager): EventStore {
  return new EventStore(eventBufferCap(), (ev) => {
    const persist = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<boolean>('persistEventLog');
    if (persist === false) {
      return;
    }
    const folder = stateManager.getPrimaryFolder();
    if (!folder) {
      return;
    }
    void (async () => {
      try {
        const st = stateManager.getCached(folder) ?? (await stateManager.load(folder));
        const sid = st.sessionId ?? 'unknown';
        await appendEventJsonl(folder.uri.fsPath, sid, ev);
      } catch {
        /* ignore IO errors */
      }
    })();
  });
}

async function ensureIgnoreMatcher(folder: vscode.WorkspaceFolder): Promise<IgnoreMatcher> {
  const cfg = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION);
  workspaceIgnoreMatcher = await IgnoreMatcher.forWorkspaceRoot(
    folder.uri.fsPath,
    cfg.get<boolean>('useDefaultIgnoreRules') !== false,
    cfg.get<string[]>('extraIgnoreSubstrings') ?? [],
  );
  return workspaceIgnoreMatcher;
}

function bindIgnoreFileWatcher(folder: vscode.WorkspaceFolder, matcher: IgnoreMatcher): void {
  disposeIgnoreWatchers();
  const bindOne = (pattern: string) => {
    const w = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, pattern));
    const reload = (): void => {
      void matcher.reloadWorkspaceFile(folder.uri.fsPath);
    };
    w.onDidChange(reload);
    w.onDidCreate(reload);
    w.onDidDelete(reload);
    ignoreDisposables.push(w);
  };
  bindOne(CONTORA_IGNORE_FILE);
  bindOne(CONTORA_LEGACY_IGNORE_FILE);
}

async function mergeDiskIfEnabled(stateManager: StateManager, es: EventStore | undefined): Promise<void> {
  if (!es || !mergeDiskEventLogEnabled()) {
    return;
  }
  const folder = stateManager.getPrimaryFolder();
  if (!folder) {
    return;
  }
  try {
    const st = stateManager.getCached(folder) ?? (await stateManager.load(folder));
    const sid = st.sessionId ?? 'unknown';
    const disk = await EventLog.replay(folder.uri.fsPath, sid);
    es.mergeFromDisk(disk);
  } catch {
    /* ignore */
  }
}

function startScanners(
  stateManager: StateManager,
  eventStore: EventStore,
  onAfterPersist?: () => void,
): WorkspaceScanner[] {
  disposeScanners();
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return [];
  }
  const next: WorkspaceScanner[] = [];
  for (const folder of folders) {
    const s = new WorkspaceScanner(folder, stateManager, eventStore, onAfterPersist);
    s.start();
    next.push(s);
  }
  scanners = next;
  return next;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const stateManager = new StateManager();
  const memoryBuilder = new MemoryBuilder();
  const contextBuilder = new ContextBuilder();
  const modeEngine = new ModeEngine();

  const sidebar = new ContoraSidebarProvider(context, stateManager);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ContoraSidebarProvider.viewId, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  const syncWorkspace = async (): Promise<void> => {
    globalEventStore = createEventStore(stateManager);
    startScanners(stateManager, globalEventStore, () => {
      void sidebar.refresh();
    });
    sidebar.setEventStore(globalEventStore);
    const folder = stateManager.getPrimaryFolder();
    sidebar.setWorkspaceFolder(folder);
    if (folder) {
      const m = await ensureIgnoreMatcher(folder);
      bindIgnoreFileWatcher(folder, m);
    } else {
      disposeIgnoreWatchers();
      workspaceIgnoreMatcher = undefined;
    }
    await mergeDiskIfEnabled(stateManager, globalEventStore);
  };

  await syncWorkspace();
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => void syncWorkspace()));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      try {
        if (e.affectsConfiguration('contora.maxEventBuffer')) {
          await syncWorkspace();
          return;
        }
        if (e.affectsConfiguration('contora.mergeDiskEventLog')) {
          await mergeDiskIfEnabled(stateManager, globalEventStore);
          return;
        }
        if (
          e.affectsConfiguration('contora.useDefaultIgnoreRules') ||
          e.affectsConfiguration('contora.extraIgnoreSubstrings')
        ) {
          const folder = stateManager.getPrimaryFolder();
          if (folder && workspaceIgnoreMatcher) {
            const cfg = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION);
            workspaceIgnoreMatcher.updateSettings(
              cfg.get<boolean>('useDefaultIgnoreRules') !== false,
              cfg.get<string[]>('extraIgnoreSubstrings') ?? [],
            );
          }
        }
      } finally {
        if (e.affectsConfiguration(CONTORA_CONFIG_SECTION)) {
          void sidebar.refresh();
        }
      }
    }),
  );

  context.subscriptions.push(
    context.secrets.onDidChange((ev) => {
      if (ev.key.startsWith('contora.apiKey.')) {
        void sidebar.refresh();
      }
    }),
  );

  const primary = stateManager.getPrimaryFolder();
  if (primary) {
    await stateManager.load(primary);
  }

  const shouldIgnore = (): ((p: string) => boolean) => {
    const m = workspaceIgnoreMatcher;
    if (m) {
      return (p: string) => m.shouldIgnore(p);
    }
    const cfg = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION);
    return (p: string) =>
      shouldIgnoreWorkspacePath(p, cfg.get<boolean>('useDefaultIgnoreRules') !== false, cfg.get<string[]>('extraIgnoreSubstrings') ?? []);
  };

  const contoraKeys = new ContoraKeyManager(context.secrets);
  const aiProviders = new ProviderManager(contoraKeys);

  const runExport = async () => {
    const folder = stateManager.getPrimaryFolder();
    if (!folder) {
      await vscode.window.showWarningMessage('Contora: Open a folder workspace first.');
      return;
    }
    if (!workspaceIgnoreMatcher) {
      await ensureIgnoreMatcher(folder);
    }
    const es = globalEventStore;
    if (!es) {
      return;
    }
    for (const s of scanners) {
      await s.flushNow();
    }
    const cfgExport = vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION);
    const state = await stateManager.load(folder);
    const sessionId = state.sessionId ?? 'unknown';
    const mode = modeEngine.normalizeMode(
      vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<string>('defaultAIMode'),
    );
    const strategy = getModeStrategy(mode);
    const ig = shouldIgnore();

    const evAll = es.getAll();
    const evRank = evAll.length > 500 ? evAll.slice(-500) : evAll;

    const pipe = rankContextFilesWithDebug(state, evRank, strategy, ig, 3);
    let ranked = pipe.ranked;
    const analysis = analyzeActivity(evRank, state, ig);
    const sumBlock = buildSemanticSummaryBlock(analysis, state, 8, evRank, ig, {
      rankingDebug: pipe.debugExplanations,
    });
    const semanticMd = sumBlock.markdown;

    const budget = exportTokenBudget();
    let rankedForTop = ranked;
    if (budget > 0) {
      rankedForTop = allocate(ranked, budget, { semanticMarkdown: semanticMd, graphMarkdown: '' }).priorityItems;
    }
    const take = maxPriorityFilesCap(strategy.maxPriorityFiles);
    const priorityTop = rankedForTop.slice(0, take);

    const recent = es.getLast(eventsInPrompt());
    const memory = memoryBuilder.build(state, recent, sessionId);
    applyIgnoreToMemory(memory, ig);
    memory.priorityFiles = priorityTop;
    memory.semanticSummary = semanticMd;

    const aiExtra = await tryAppendAiSummaryOnExport(
      cfgExport,
      memory,
      semanticMd,
      evRank.length,
      aiProviders,
    );
    if (aiExtra) {
      memory.aiSemanticSummary = aiExtra;
    }

    const baseQ = analyzeContextQuality({
      estimatedSemanticTokens: estimateTokens(semanticMd),
      exportTokenBudget: budget,
      priorityPathCount: priorityTop.length,
      duplicatePathCount: countDuplicatePaths([
        ...priorityTop.map((p) => p.path),
        ...state.openFiles,
        ...state.recentFiles.slice(0, 24),
      ]),
      eventCount: evRank.length,
      lowSignalRatio:
        evRank.length > 0
          ? 1 - Math.min(1, Object.keys(analysis.fileActivity).length / evRank.length)
          : 0,
    });
    const quality = {
      score: baseQ.score,
      warnings: [...baseQ.warnings, ...listIgnoredPathIssues(priorityTop.map((p) => p.path), ig)],
    };

    const instruction = modeEngine.getInstruction(mode);
    const promptText = contextBuilder.buildPrompt(memory, mode, instruction);
    let payload = buildContextPayloadV2(
      memory,
      priorityTop,
      semanticMd,
      analysis,
      mode,
      instruction,
      strategy.strategyLabel,
      quality,
    );

    const fmt = readExportFormat();
    let text = formatWithAdapter(fmt, promptText, payload, mode);

    if (budget > 0) {
      if (fmt === 'json') {
        payload = trimContextPayloadForBudget(payload, budget);
        text = formatWithAdapter(fmt, promptText, payload, mode);
      } else {
        const overhead = estimateExportAdapterOverheadTokens(fmt);
        const innerBudget = Math.max(32, budget - overhead - 2);
        const trimmedPrompt = trimStringToTokenBudget(promptText, innerBudget);
        text = formatWithAdapter(fmt, trimmedPrompt, payload, mode);
      }
    }

    await vscode.env.clipboard.writeText(text);

    const fmtLabel =
      fmt === 'json'
        ? 'JSON (schema v2)'
        : fmt === 'cursor'
          ? 'Cursor fences'
          : fmt === 'claude'
            ? 'Claude'
            : fmt === 'openai'
              ? 'OpenAI messages'
              : 'Markdown blocks';
    const note = budget > 0 && estimateTokens(text) >= budget * 0.98 ? ' (trimmed to token budget)' : '';
    await vscode.window.showInformationMessage(`Contora: Copied context (${fmtLabel})${note}`);
  };

  context.subscriptions.push(vscode.commands.registerCommand('contora.exportAIContext', runExport));

  registerPhase3AiRuntime(
    context,
    {
      stateManager,
      getEventStore: () => globalEventStore,
      memoryBuilder,
      modeEngine,
      flushScanners: async () => {
        for (const s of scanners) {
          await s.flushNow();
        }
      },
      eventsInPrompt,
      exportTokenBudget,
      maxPriorityFilesCap,
      shouldIgnore,
      refreshSidebar: () => {
        void sidebar.refresh();
      },
    },
    { keys: contoraKeys, providers: aiProviders },
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('contora.saveStateNow', async () => {
      const folder = stateManager.getPrimaryFolder();
      if (!folder) {
        await vscode.window.showWarningMessage('Contora: Open a folder workspace first.');
        return;
      }
      if (!workspaceIgnoreMatcher) {
        await ensureIgnoreMatcher(folder);
      }
      for (const s of scanners) {
        await s.flushNow();
      }
      const state = await stateManager.load(folder);
      if (writeLatestMemoryOnSaveEnabled() && globalEventStore) {
        try {
          const ig = shouldIgnore();
          const mode = modeEngine.normalizeMode(
            vscode.workspace.getConfiguration(CONTORA_CONFIG_SECTION).get<string>('defaultAIMode'),
          );
          const strategy = getModeStrategy(mode);
          const evAll = globalEventStore.getAll();
          const evRank = evAll.length > 500 ? evAll.slice(-500) : evAll;
          const pipe = rankContextFilesWithDebug(state, evRank, strategy, ig, 2);
          let ranked = pipe.ranked;
          const analysis = analyzeActivity(evRank, state, ig);
          const sumBlock = buildSemanticSummaryBlock(analysis, state, 8, evRank, ig, {
            rankingDebug: pipe.debugExplanations,
          });
          const semanticMd = sumBlock.markdown;
          const budget = exportTokenBudget();
          let rankedForTop = ranked;
          if (budget > 0) {
            rankedForTop = allocate(ranked, budget, { semanticMarkdown: semanticMd, graphMarkdown: '' }).priorityItems;
          }
          const take = maxPriorityFilesCap(strategy.maxPriorityFiles);
          const priorityTop = rankedForTop.slice(0, take);
          const recent = globalEventStore.getLast(eventsInPrompt());
          const memory = memoryBuilder.build(state, recent, state.sessionId ?? 'unknown');
          applyIgnoreToMemory(memory, ig);
          memory.priorityFiles = priorityTop;
          memory.semanticSummary = semanticMd;
          const baseQ = analyzeContextQuality({
            estimatedSemanticTokens: estimateTokens(semanticMd),
            exportTokenBudget: budget,
            priorityPathCount: priorityTop.length,
            duplicatePathCount: countDuplicatePaths([
              ...priorityTop.map((p) => p.path),
              ...state.openFiles,
              ...state.recentFiles.slice(0, 24),
            ]),
            eventCount: evRank.length,
            lowSignalRatio:
              evRank.length > 0
                ? 1 - Math.min(1, Object.keys(analysis.fileActivity).length / evRank.length)
                : 0,
          });
          const quality = {
            score: baseQ.score,
            warnings: [...baseQ.warnings, ...listIgnoredPathIssues(priorityTop.map((p) => p.path), ig)],
          };
          const fp = await writeLatestMemoryJson(folder.uri.fsPath, {
            savedAt: Date.now(),
            mode,
            strategyLabel: strategy.strategyLabel,
            memory,
            analysis,
            intelligence: sumBlock.intelligence,
            quality,
          });
          void fp;
        } catch {
          /* ignore memory mirror errors */
        }
      }
      await sidebar.refresh();
      await vscode.window.showInformationMessage('Contora: State saved to .contora/state.json.');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('contora.restoreSession', async () => {
      const folder = stateManager.getPrimaryFolder();
      if (!folder) {
        await vscode.window.showWarningMessage('Contora: Open a folder workspace first.');
        return;
      }
      const st = await stateManager.load(folder);
      await restoreEditorsFromState(folder, st);
      await vscode.window.showInformationMessage('Contora: Opened editors from saved state.');
    }),
  );

  context.subscriptions.push({ dispose: () => disposeScanners() });
  context.subscriptions.push({ dispose: () => disposeIgnoreWatchers() });
}

export function deactivate(): void {
  disposeScanners();
  disposeIgnoreWatchers();
}
