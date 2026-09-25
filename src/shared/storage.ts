import { randomAvatarId } from "./avatars";
import { isGuestPeerId, randomGuestPeerId } from "./ids";

const NICK_KEY = "chillax.nickname";
const AVATAR_KEY = "chillax.avatar";
const GUEST_PEER_KEY = "chillax.guestPeerId";

export async function loadNickname(): Promise<string> {
  const stored = await chrome.storage.local.get(NICK_KEY);
  const value = stored[NICK_KEY];
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 24);
  const generated = `Guest ${Math.floor(100 + Math.random() * 900)}`;
  await saveNickname(generated);
  return generated;
}

export async function saveNickname(nickname: string): Promise<string> {
  const next = nickname.trim().slice(0, 24) || `Guest ${Math.floor(100 + Math.random() * 900)}`;
  await chrome.storage.local.set({ [NICK_KEY]: next });
  return next;
}

export async function loadAvatarId(): Promise<string> {
  const stored = await chrome.storage.local.get(AVATAR_KEY);
  const value = stored[AVATAR_KEY];
  if (typeof value === "string" && value) return value;
  const generated = randomAvatarId();
  await saveAvatarId(generated);
  return generated;
}

export async function saveAvatarId(avatarId: string): Promise<string> {
  await chrome.storage.local.set({ [AVATAR_KEY]: avatarId });
  return avatarId;
}

export async function loadGuestPeerId(): Promise<string> {
  const stored = await chrome.storage.local.get(GUEST_PEER_KEY);
  const value = stored[GUEST_PEER_KEY];
  if (typeof value === "string" && isGuestPeerId(value)) return value;
  const generated = randomGuestPeerId();
  await saveGuestPeerId(generated);
  return generated;
}

export async function saveGuestPeerId(peerId: string): Promise<string> {
  const next = isGuestPeerId(peerId) ? peerId : randomGuestPeerId();
  await chrome.storage.local.set({ [GUEST_PEER_KEY]: next });
  return next;
}
