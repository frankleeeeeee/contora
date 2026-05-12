import type * as vscode from 'vscode';

export type StoredProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek';

function secretKey(provider: StoredProviderId): string {
  return `contora.apiKey.${provider}`;
}

/** BYOK: API keys only in VS Code SecretStorage (never settings.json). */
export class ContoraKeyManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  getKey(provider: StoredProviderId): Thenable<string | undefined> {
    return this.secrets.get(secretKey(provider));
  }

  setKey(provider: StoredProviderId, value: string): Thenable<void> {
    return this.secrets.store(secretKey(provider), value);
  }

  deleteKey(provider: StoredProviderId): Thenable<void> {
    return this.secrets.delete(secretKey(provider));
  }
}
