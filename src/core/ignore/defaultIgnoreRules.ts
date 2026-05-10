/**
 * Spec 2.3 — default noisy path substrings (match on workspace-relative paths using `/`).
 * Not `.gitignore`: only for ranking / export / summary context trimming.
 */
export const DEFAULT_IGNORE_SUBSTRINGS: readonly string[] = [
  'node_modules/',
  '/node_modules/',
  '.git/',
  '/.git/',
  '/dist/',
  '/build/',
  '/out/',
  'venv/',
  '.venv/',
  '__pycache__/',
  'site-packages/',
  '.next/',
  '/coverage/',
  '.turbo/',
  'target/', // rust default
];
