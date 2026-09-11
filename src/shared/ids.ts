import { TOKEN_KEY } from "./constants";
import type { Platform } from "./types";

const ROOM_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomRoomId(): string {
  let id = "cx";
  for (let i = 0; i < 6; i += 1) {
    id += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return id;
}

export function parseRoomToken(href = location.href): string | null {
  try {
    const url = new URL(href);
    const fromQuery = url.searchParams.get(TOKEN_KEY);
    if (fromQuery) return fromQuery.trim();
    const hash = url.hash.replace(/^#/, "");
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const fromHash = params.get(TOKEN_KEY);
    return fromHash?.trim() || null;
  } catch {
    return null;
  }
}

export function normalizeRoomCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  const named = /(?:^|[?&#/])chillax=([^&\s#]+)/i.exec(trimmed);
  if (named?.[1]) {
    try {
      candidate = decodeURIComponent(named[1]);
    } catch {
      candidate = named[1];
    }
  } else {
    const fromUrl = parseRoomToken(trimmed);
    if (fromUrl) candidate = fromUrl;
  }
  const compact = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
  return compact.match(new RegExp(`cx[${ROOM_CHARS}]{6}`))?.[0] ?? null;
}

export function buildInviteUrl(
  platform: Platform,
  contentId: string,
  roomId: string,
  href = location.href,
): string {
  const url = new URL(href);
  url.searchParams.delete(TOKEN_KEY);
  if (platform === "youtube") {
    url.searchParams.set("v", contentId);
    url.searchParams.set(TOKEN_KEY, roomId);
    url.hash = "";
  } else {
    url.hash = `${TOKEN_KEY}=${roomId}`;
  }
  return url.toString();
}

export function writeTokenToLocation(platform: Platform, roomId: string) {
  const next = buildInviteUrl(
    platform,
    platform === "youtube"
      ? new URLSearchParams(location.search).get("v") || ""
      : location.pathname.match(/\/watch\/(\d+)/)?.[1] || "",
    roomId,
  );
  history.replaceState(history.state, "", next);
}

export function clearTokenFromLocation(platform: Platform) {
  const url = new URL(location.href);
  url.searchParams.delete(TOKEN_KEY);
  if (platform === "netflix") {
    const params = new URLSearchParams(url.hash.replace(/^#/, ""));
    params.delete(TOKEN_KEY);
    url.hash = params.toString();
  }
  history.replaceState(history.state, "", url.toString());
}

export function isSupportedHost(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "netflix.com" || host.endsWith(".netflix.com");
  } catch {
    return false;
  }
}

export function hueFromId(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

export function extensionOrigin(): string {
  return new URL(chrome.runtime.getURL("src/media/index.html")).origin;
}

export function mediaPageUrl(): string {
  return chrome.runtime.getURL("src/media/index.html");
}
