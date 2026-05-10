# Contora

A **local workspace memory and AI-context export** extension for VS Code and Cursor. It remembers what you were doing in a project (task, notes, open files, working set, Git paths), records a **short event history**, and can **copy a structured summary** to the clipboard for LLMs — without cloud sync and without reading chat logs.

**Current version:** see `package.json` (e.g. **0.4.x**).  
**Repository:** [context-recall](https://github.com/frankleeeeeee/context-recall) (Contora product) · **License:** [MIT](LICENSE)

---

## What you get (at a glance)

| Capability | What it means |
|------------|----------------|
| **Persistent state** | `sessionId`, task, notes, open tabs, working set, `gitStaged` / `gitWorking` → **`.contora/state.json`** (legacy **`.context-recall/state.json`** is read if present). |
| **Event log (optional)** | Append-only **JSONL** per session under **`.contora/events/<sessionId>.jsonl`**. |
| **Ring buffer** | Recent focus/save/git/task events in memory; size capped by settings; can **merge from disk** on reload. |
| **Checkpoints** | **Save snapshot** writes `snapshots/checkpoint-*.json` (state + tail of events). **Restore from snapshot** picks a file and restores. |
| **Ignore noise** | Default path substrings + **`contora.extraIgnoreSubstrings`** + workspace **`.contoraignore`** (legacy **`.contextrecallignore`** still merged). |
| **Ranking & modes** | `debug` / `feature` / `refactor` / `review` change **weights** for priority files; scores go through a **normalized pipeline** (stable blend). |
| **Heuristic “intelligence”** | No LLM: signals → **development pattern**, **workspace intent line**, **focus area**, optional **ranking debug** in the semantic block; JSON may include **`intelligence`** and **`quality`**. |
| **Token budget** | `exportTokenBudget` trims text exports or shrinks JSON/MCP; **allocate** reserves room for summary/graph before capping priority list. |
| **Co-occurrence graph** | Weak **CONTEXT GRAPH** from recent events (window size configurable). |

**Does not:** sync to the cloud, read Cursor Chat, or call external APIs for your session data. **Does not** replace `git log` — only **`git status`**-style paths via **simple-git**.

---

## Requirements

- Open a **folder** workspace (**File → Open Folder**). Single-file windows have no workspace root.
- VS Code engine **^1.85.0** (see `package.json`).

---

## Quick start

1. Open a folder workspace.
2. Open the **Contora** activity bar view (sidebar id **Contora**).
3. Edit **task** and **notes**; lists show working set and Git paths (click to open).
4. **Export AI context** — copies structured context to the clipboard (format from settings).
5. **Save session state now** — flushes `state.json` under **`.contora/`** (and optionally `memory/latest-memory.json`).
6. **Save snapshot** / **Restore from snapshot** — checkpoints under **`.contora/snapshots/`** (legacy **`.context-recall/snapshots/`** listed if present).

Optional: add **`.contoraignore`** at the workspace root to exclude path substrings from ranking/summary/export lists.

---

## Commands (Command Palette)

| Command ID | Title (palette) |
|------------|------------------|
| `contora.exportAIContext` | Contora: Export AI context |
| `contora.saveStateNow` | Contora: Save session state now |
| `contora.restoreSession` | Contora: Restore editors from snapshot |
| `contora.saveSnapshot` | Contora: Save workspace snapshot (JSON) |
| `contora.restoreFromSnapshot` | Contora: Restore from snapshot… |

Bind keys in **Keyboard Shortcuts** by searching for these IDs.

---

## Configuration (`contora.*`)

| Setting | Default | Role |
|---------|---------|------|
| `autoRestoreOnOpen` | `true` | Re-open editors from last `state.json` when opening the folder. |
| `maxRestoreEditors` | `8` | Max tabs to open on restore (`0` = none on auto-restore). |
| `workingSetMaxFiles` | `40` | Max paths in working set (`recentFiles`). |
| `defaultAIMode` | `feature` | `debug` \| `feature` \| `refactor` \| `review` — affects **ranking weights** and export instruction tone. |
| `exportFormat` | `markdown` | `markdown` \| `cursor` \| `json` \| `claude` \| `openai` \| `mcp`. |
| `persistEventLog` | `true` | Append events to `.contora/events/<sessionId>.jsonl`. |
| `maxEventBuffer` | `200` | In-memory event ring buffer cap. |
| `eventsInPrompt` | `50` | Recent events embedded in export (`# RECENT EVENTS`). |
| `maxPriorityFiles` | `12` | Cap on priority file list (also bounded by mode strategy). |
| `exportTokenBudget` | `0` | Approx max tokens (`0` = unlimited). |
| `useDefaultIgnoreRules` | `true` | Skip noisy paths (`node_modules`, `.git`, …). |
| `extraIgnoreSubstrings` | `[]` | Extra case-insensitive substring excludes on relative paths. |
| `cooccurrenceWindow` | `10` | Sliding window for co-occurrence graph. |
| `mergeDiskEventLog` | `true` | On workspace sync, merge JSONL from disk into ring buffer (same `sessionId`). |
| `writeLatestMemoryOnSave` | `true` | After save, write `.contora/memory/latest-memory.json` (mirror for tooling). |

---

## On-disk layout

```text
<workspace-root>/
├── .contoraignore               # optional: one path substring per line, # comments
└── .contora/
    ├── state.json                # main snapshot
    ├── events/<sessionId>.jsonl  # optional append-only log
    ├── snapshots/checkpoint-*.json
    └── memory/latest-memory.json # optional mirror after “Save session state”
```

Older workspaces may still have **`.context-recall/`** and **`.contextrecallignore`**; Contora reads them for compatibility but new writes go to **`.contora/`** and **`.contoraignore`**.

Do not commit **`.contora/`** if your team treats it as personal scratch — add it to `.gitignore` if needed.

---

## Privacy

All session data stays **under the workspace root** in **`.contora/`** (with legacy read paths as above). This extension does **not** add telemetry and does **not** intentionally send your session data over the network.

---

## Installation & development

**From VSIX:** Extensions → ⋯ → **Install from VSIX…** → reload window.

**From source:**

```bash
git clone https://github.com/frankleeeeeee/context-recall.git
cd context-recall   # or your clone folder, e.g. sessionrecall
npm install
npm run compile
```

Press **F5** for Extension Development Host. Package: `npm run compile` then `npx @vscode/vsce package`.

---

## Migration

- **Contora (current):** primary data dir **`.contora/`**, settings/commands **`contora.*`**, ignore **`.contoraignore`**.
- Legacy **`.context-recall/`** / **`.contextrecallignore`** — still read where applicable; saving moves state forward under **`.contora/`**.
- Legacy **`.project-recall/`** → rename to **`.context-recall/`** (or **`.contora/`**) and move `state.json` if you still have that layout.
- Old **`projectRecall.*`** → **`contextRecall.*`** (historical) → **`contora.*`** (current).
- Old **`gitModified[]`** only → migrated to **`gitWorking`** on load (v0.3.0+).

---

## Project structure (high level)

```text
src/
├── extension.ts
├── core/                 # context engine: semantic, ranking, schema, ignore, budget, graph, events, snapshots, compression, focus, quality, adapters
├── storage/
├── scanner/
├── state/
├── ui/
└── types/
docs/UPGRADE_PLAN_2.x.md
```

---

## Contributing

PRs welcome. Run **`npm run compile`** before submitting.

---

## License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 frankleeeeeee.

---

## Usage guide (detailed)

**What it does in plain terms:** under your **opened folder**, it keeps **task**, **notes**, **open tabs**, a **working set** (files you recently focused or saved), **Git staged / working-tree paths**, and a short **event stream**. When you need an LLM, **Export AI context** copies a formatted bundle to the clipboard. **No cloud upload** and **no reading of chat history**.

### When to use which action

| Situation | What to do |
|-----------|------------|
| End of day / pin current progress | Sidebar **Save now** (writes `state.json`). |
| Before a risky refactor or branch switch | **Save snapshot** (checkpoint on disk). |
| Undo to a saved point | **Restore snapshot** → pick a checkpoint file. |
| Explain state to an LLM | **Copy AI context** → paste into the model. |
| Resume yesterday’s files | Leave **auto-restore** on, or **Restore editors** (opens paths only — not full IDE layout). |
| Ranking polluted by build dirs | Keep default ignore on; add **`.contoraignore`** and/or **`extraIgnoreSubstrings`**. |
| Export too long | Lower **`exportTokenBudget`**, **`maxPriorityFiles`**, **`eventsInPrompt`**. |

### Sidebar walkthrough

1. **File → Open Folder** (required; single-file windows have no workspace root).  
2. Activity bar → **Contora** → sidebar **Contora**.  
3. Top row: **Copy AI context**, **Save now**, **Restore editors**, **Save snapshot**, **Restore snapshot** (same as Command Palette commands).  
4. **Current task** / **Notes** below; click a path in the lists to open that file. The working set is “recently focused or saved”, not every tab ever opened.

### Command Palette

`Ctrl+Shift+P` / `Cmd+Shift+P` → type **Contora** → pick any of the five commands above. Bind keys via **Keyboard Shortcuts** using the command IDs in the table earlier.

### `.contoraignore`

At the **workspace root**, one path **substring** per line (case-insensitive); if a relative path **contains** that substring, it is excluded from ranking, summary, and export lists. Lines starting with `#` are comments. Legacy **`.contextrecallignore`** is still honored.

Example:

```text
# build output
dist/
coverage/
```

### Export / “intelligence” (v0.4.x)

- **Modes** `debug` / `feature` / `refactor` / `review` — change **importance weights** only; they do not change how you edit code.  
- **Semantic block** — heuristic summary (hot areas, intent line, pattern, optional **ranking pipeline** debug). **No LLM API calls.**  
- **JSON** — Schema v2 may include optional **`intelligence`** (intent / pattern / focus) and **`quality`** (score + warnings) for downstream tools.

### Backup

Zip the whole **`.contora/`** folder to back up local memory (include **`.context-recall/`** only if you have not migrated yet). Deleting data dirs clears workspace-local memory for that project (it will rebuild as you work).

---

For the layered design notes (2.0 → 2.1 merge), see **`docs/UPGRADE_PLAN_2.x.md`**.
