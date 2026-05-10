import type { AIMode } from '../context/modeEngine';
import { debugStrategy } from './debugStrategy';
import { featureStrategy } from './featureStrategy';
import { refactorStrategy } from './refactorStrategy';
import { reviewStrategy } from './reviewStrategy';
import type { ModeStrategy } from './strategyTypes';

export type { ModeStrategy } from './strategyTypes';

export function getModeStrategy(mode: AIMode): ModeStrategy {
  switch (mode) {
    case 'debug':
      return debugStrategy;
    case 'review':
      return reviewStrategy;
    case 'refactor':
      return refactorStrategy;
    case 'feature':
    default:
      return featureStrategy;
  }
}
