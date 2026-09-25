import { STUN_SERVERS, TURN_ENDPOINT } from "../shared/constants";

let cached: { servers: RTCIceServer[]; expiresAt: number } | null = null;

export async function loadIceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() < cached.expiresAt) return cached.servers;
  try {
    const response = await fetch(TURN_ENDPOINT, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`TURN endpoint returned ${response.status}`);
    const { iceServers, ttl } = (await response.json()) as { iceServers: RTCIceServer[]; ttl: number };
    const servers = [...STUN_SERVERS, ...iceServers];
    // Refresh well before expiry so a party started late in the window keeps a valid relay.
    cached = { servers, expiresAt: Date.now() + (ttl * 1000) / 2 };
    return servers;
  } catch {
    return STUN_SERVERS;
  }
}
