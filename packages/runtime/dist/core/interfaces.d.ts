/**
 * High-level runtime contract for Contora.
 * Extension wiring uses hooks (enrichPromptForProvider, …); RuntimeProvider is used for tooling and tier checks.
 */
export type RuntimeMode = 'chat' | 'code' | 'refactor';
export interface EditorState {
    /** Opaque snapshot id or label. */
    label?: string;
}
export interface RuntimeInput {
    query: string;
    context: ContextItem[];
    editorState?: EditorState;
    mode?: RuntimeMode;
}
export type ContextItemType = 'file' | 'selection' | 'terminal' | 'git' | 'note';
export interface ContextItem {
    id: string;
    type: ContextItemType;
    content: string;
    score?: number;
}
export interface IntentResult {
    type: string;
    confidence: number;
}
export interface PromptInput {
    intent: IntentResult;
    context: ContextItem[];
    mode: string;
}
export interface MemoryProvider {
    /** Placeholder for future memory graph. */
    getSnapshot?(): string | undefined;
}
export interface RuntimeProvider {
    buildIntent(input: RuntimeInput): IntentResult;
    rankContext(context: ContextItem[]): ContextItem[];
    compressContext(context: ContextItem[]): ContextItem[];
    buildPrompt(data: PromptInput): string;
    memory?: MemoryProvider;
}
