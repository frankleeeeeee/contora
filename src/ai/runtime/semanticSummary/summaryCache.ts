interface CacheEntry {
  text: string;
  expires: number;
}

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

export function getCachedSemanticSummary(key: string): string | undefined {
  const e = store.get(key);
  if (!e) {
    return undefined;
  }
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.text;
}

export function setCachedSemanticSummary(key: string, text: string, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { text, expires: Date.now() + ttlMs });
}

export function clearSemanticSummaryCache(): void {
  store.clear();
}
