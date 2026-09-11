import type { ProtocolMessage } from "../shared/types";

export function encodeMessage(message: ProtocolMessage): string {
  return JSON.stringify(message);
}

export function decodeMessage(raw: string): ProtocolMessage | null {
  try {
    const parsed = JSON.parse(raw) as ProtocolMessage;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
