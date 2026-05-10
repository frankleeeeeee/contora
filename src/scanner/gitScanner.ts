import simpleGit, { SimpleGit } from 'simple-git';

export interface GitScanResult {
  staged: string[];
  working: string[];
}

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Split Git status into staged vs working tree (2.x WorkspaceMemory.gitState).
 */
export async function scanGitState(workspaceRoot: string): Promise<GitScanResult> {
  let git: SimpleGit;
  try {
    git = simpleGit(workspaceRoot);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { staged: [], working: [] };
    }
  } catch {
    return { staged: [], working: [] };
  }

  try {
    const status = await git.status();
    const staged = new Set<string>();
    const working = new Set<string>();

    for (const p of status.staged) {
      staged.add(norm(p));
    }
    for (const p of status.modified) {
      working.add(norm(p));
    }
    for (const p of status.not_added) {
      working.add(norm(p));
    }
    for (const p of status.created) {
      working.add(norm(p));
    }
    for (const p of status.deleted) {
      working.add(norm(p));
    }
    for (const p of status.renamed) {
      if (p.to) {
        working.add(norm(p.to));
      }
    }
    for (const p of status.conflicted) {
      working.add(norm(p));
    }

    return { staged: [...staged], working: [...working] };
  } catch {
    return { staged: [], working: [] };
  }
}

/** Combined unique paths (sidebar flat list / legacy). */
export async function scanGitMerged(workspaceRoot: string): Promise<string[]> {
  const { staged, working } = await scanGitState(workspaceRoot);
  return [...new Set([...staged, ...working])];
}
