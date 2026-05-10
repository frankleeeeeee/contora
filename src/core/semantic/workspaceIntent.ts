import type { ProjectState } from '../../types/state';
import type { ActivityAnalysis } from './activityAnalyzer';
import type { BehavioralSignals } from './signalCollector';

function topFilesBlob(analysis: ActivityAnalysis, limit: number): string {
  return Object.entries(analysis.fileActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([f]) => f)
    .join(' ')
    .toLowerCase();
}

/**
 * Short heuristic workspace-intent line from multiple signals (no LLM).
 */
export function inferWorkspaceIntentLine(
  signals: BehavioralSignals,
  task: string,
  analysis: ActivityAnalysis,
  state: ProjectState,
): string {
  const t = task.trim();
  const topDirs = Object.entries(signals.directoryWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d.toLowerCase());
  const topDir = topDirs[0] ?? '';
  const bundle = `${topDir} ${topFilesBlob(analysis, 8)}`.toLowerCase();

  let heuristic = '';
  if (/(auth|login|session|token|oauth|jwt|passport)/.test(bundle)) {
    heuristic = 'authentication / login–related flow';
  } else if (/(api|route|controller|service|graphql|grpc|endpoint)/.test(bundle)) {
    heuristic = 'API or backend service layer';
  } else if (/(component|ui|page|view|tsx|vue|svelte|scss|css)/.test(bundle)) {
    heuristic = 'frontend UI';
  } else if (/(test|spec|e2e|pytest|jest|vitest|cypress)/.test(bundle)) {
    heuristic = 'tests or quality gates';
  } else if (/(migration|schema|prisma|sequelize|database|sql)/.test(bundle)) {
    heuristic = 'data layer or persistence';
  } else if (/(ci|github|workflow|docker|k8s|helm|deploy)/.test(bundle)) {
    heuristic = 'delivery / infra / CI';
  } else if (topDir) {
    heuristic = `hotspot around "${topDir}"`;
  } else {
    heuristic = 'general workspace activity';
  }

  if (t) {
    return `Stated task: "${t}". Signals suggest ${heuristic}.`;
  }
  return `Likely focus: ${heuristic} (no explicit task field).`;
}
