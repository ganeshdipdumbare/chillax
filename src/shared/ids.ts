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
  const url = new URL(href);
  const fromQuery = url.searchParams.get(TOKEN_KEY);
  if (fromQuery) return fromQuery.trim();
  const hash = url.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const fromHash = params.get(TOKEN_KEY);
  return fromHash?.trim() || null;
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
