"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIntentPromptPair = buildIntentPromptPair;
exports.buildSemanticSummaryPromptPair = buildSemanticSummaryPromptPair;
exports.buildCompressionPromptPair = buildCompressionPromptPair;
const INTENT_SYSTEM = `You analyze a software workspace snapshot. Reply with JSON only, no markdown, matching this schema:
{"mode":"debug|feature|refactor|review|unknown","focus":"short phrase","risk":"short phrase","activeModules":["module","..."]}
Use only information implied by paths and task text. If unsure, use "unknown" for mode.`;
const SEMANTIC_SYSTEM = 'You are a senior engineer assistant. Given structured workspace context, write a concise semantic summary (plain prose, no markdown headings). Focus on what the developer is likely doing right now, which areas of the codebase matter, and how Git activity relates. Do not invent file contents; only infer from paths and metadata.';
const COMPRESSION_SYSTEM = 'You compress developer context. Preserve technical names and paths. Output plain text only, shorter than input.';
function buildIntentPromptPair(input) {
    const user = [
        '# Task',
        input.task || '(empty)',
        '',
        '# Top paths',
        input.topPaths.join('\n'),
        '',
        '# Git modified (sample)',
        input.gitModified.slice(0, 40).join('\n') || '—',
    ].join('\n');
    return { system: INTENT_SYSTEM, user };
}
function buildSemanticSummaryPromptPair(input) {
    const priority = input.priorityLines.join('\n');
    const events = input.recentActivityLines.join('\n');
    const user = [
        '# Current task',
        input.task || '(empty)',
        '',
        '# Notes',
        input.notes || '(empty)',
        '',
        '# Priority paths',
        priority || '(none)',
        '',
        '# Git',
        `staged: ${input.gitStaged.join(', ') || '—'}`,
        `working: ${input.gitModified.join(', ') || '—'}`,
        '',
        '# Local heuristic summary (may be imperfect)',
        input.heuristicBlock || '(none)',
        '',
        '# Recent activity (tail)',
        events || '(none)',
    ].join('\n');
    return { system: SEMANTIC_SYSTEM, user };
}
function buildCompressionPromptPair(trimmedText) {
    return {
        system: COMPRESSION_SYSTEM,
        user: `Compress the following while keeping critical file paths and tasks:\n\n${trimmedText}`,
    };
}
