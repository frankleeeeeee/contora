import type { AIMode } from '../context/modeEngine';
import type { ContextPayloadV2 } from '../schema/contextPayloadV2';
import { buildMcpGetContextEnvelope } from '../mcp/contextProvider';

export function adaptMcpEnvelope(mode: AIMode, payload: ContextPayloadV2): string {
  return JSON.stringify(buildMcpGetContextEnvelope(mode, payload), null, 2);
}
