/** Structured intent from LLM (Phase 3). */
export interface WorkspaceIntentAi {
  mode: string;
  focus: string;
  risk: string;
  activeModules: string[];
}

export function emptyWorkspaceIntent(): WorkspaceIntentAi {
  return { mode: '', focus: '', risk: '', activeModules: [] };
}
