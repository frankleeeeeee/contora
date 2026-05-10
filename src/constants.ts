/**
 * Contora — shared IDs and on-disk layout (VS Code extension).
 */

/** Settings / commands namespace: `contora.*` */
export const CONTORA_CONFIG_SECTION = 'contora';

/** Primary workspace data directory */
export const CONTORA_DATA_DIR = '.contora';

/** Previous product directory — still read for migration */
export const CONTORA_LEGACY_DATA_DIR = '.context-recall';

/** Primary ignore file at workspace root */
export const CONTORA_IGNORE_FILE = '.contoraignore';

/** Legacy ignore file — still loaded if present */
export const CONTORA_LEGACY_IGNORE_FILE = '.contextrecallignore';
