import type { AIMode } from '../context/modeEngine';
import type { ContextPayloadV2 } from '../schema/contextPayloadV2';

/**
 * MCP-style envelope (no running server) — agent-friendly JSON-RPC-like shape.
 */
export interface McpGetContextEnvelope {
  method: 'getContext';
  mode: AIMode;
  context: ContextPayloadV2;
}

export function buildMcpGetContextEnvelope(mode: AIMode, context: ContextPayloadV2): McpGetContextEnvelope {
  return { method: 'getContext', mode, context };
}
