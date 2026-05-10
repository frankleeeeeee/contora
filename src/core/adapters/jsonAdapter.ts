import type { ContextPayloadV2 } from '../schema/contextPayloadV2';

export function adaptJsonPayload(payload: ContextPayloadV2): string {
  return JSON.stringify(payload, null, 2);
}
