import type { AIMode } from './modeEngine';
import type { WorkspaceMemory } from '../models/workspaceMemory';

/**
 * Structured prompt sections (spec 2.1 Prompt Builder).
 */
export class ContextBuilder {
  buildPrompt(memory: WorkspaceMemory, mode: AIMode, instruction: string): string {
    const lines: string[] = [];
    lines.push('# TASK');
    lines.push(memory.task.trim() || '(not set)');
    lines.push('');
    lines.push('# MODE');
    lines.push(mode);
    lines.push('');
    lines.push('# WORKING FILES');
    lines.push(memory.workingFiles.length ? memory.workingFiles.map((f) => `- ${f}`).join('\n') : '(none)');
    lines.push('');
    lines.push('# OPEN FILES');
    lines.push(memory.openFiles.length ? memory.openFiles.map((f) => `- ${f}`).join('\n') : '(none)');
    lines.push('');
    if (memory.priorityFiles?.length) {
      lines.push('# PRIORITY FILES');
      for (const p of memory.priorityFiles) {
        lines.push(`- ${p.path} (score ${Math.round(p.score)})`);
      }
      lines.push('');
    }
    if (memory.semanticSummary?.trim()) {
      lines.push('# SEMANTIC SUMMARY');
      lines.push(memory.semanticSummary.trim());
      lines.push('');
    }
    if (memory.aiSemanticSummary?.trim()) {
      lines.push('# AI SEMANTIC SUMMARY (BYOK, optional)');
      lines.push(memory.aiSemanticSummary.trim());
      lines.push('');
    }
    lines.push('# GIT STATE');
    lines.push(JSON.stringify(memory.gitState, null, 2));
    lines.push('');
    lines.push('# NOTES');
    lines.push(memory.notes.trim() || '(none)');
    lines.push('');
    lines.push('# RECENT EVENTS');
    lines.push(
      memory.recentEvents.length
        ? memory.recentEvents.map((e) => JSON.stringify(e)).join('\n')
        : '(none)',
    );
    lines.push('');
    lines.push('# INSTRUCTION');
    lines.push(instruction);
    lines.push('');
    lines.push(`# SESSION`);
    lines.push(memory.sessionId);
    return lines.join('\n');
  }
}
