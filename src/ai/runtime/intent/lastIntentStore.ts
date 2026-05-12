let lastIntentJson: string | null = null;

export function setLastIntentJson(obj: unknown): void {
  try {
    lastIntentJson = JSON.stringify(obj, null, 2);
  } catch {
    lastIntentJson = null;
  }
}

export function getLastIntentJson(): string | null {
  return lastIntentJson;
}
