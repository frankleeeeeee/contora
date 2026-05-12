import { ContoraRuntime } from './ContoraRuntime';
import type { RuntimeProvider } from './core/interfaces';

/** Returns the bundled Contora {@link RuntimeProvider}. */
export function createRuntime(): RuntimeProvider {
  return new ContoraRuntime();
}
