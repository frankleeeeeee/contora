'use strict';

/**
 * Skip full compile when `package-vsix.cjs` runs vsce after `npm prune --omit=dev`
 * (TypeScript / @types are no longer in node_modules).
 */
if (process.env.CONTORA_SKIP_PREPUBLISH === '1') {
  process.exit(0);
}

const { spawnSync } = require('child_process');
const r = spawnSync('npm', ['run', 'compile'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
