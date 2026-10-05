export type Avatar = {
  id: string;
  emoji: string;
  name: string;
  fill: string;
};

export const AVATARS: Avatar[] = [
  { id: "fox", emoji: "🦊", name: "Fox", fill: "#c3d3ce" },
  { id: "panda", emoji: "🐼", name: "Panda", fill: "#adb49c" },
  { id: "ghost", emoji: "👻", name: "Ghost", fill: "#b6969d" },
  { id: "alien", emoji: "👽", name: "Alien", fill: "#1c525d" },
  { id: "cat", emoji: "🐱", name: "Cat", fill: "#d6d0c3" },
  { id: "frog", emoji: "🐸", name: "Frog", fill: "#f8dbca" },
  { id: "moon", emoji: "🌙", name: "Moon", fill: "#181e1d" },
  { id: "fire", emoji: "🔥", name: "Ember", fill: "#cec4bb" },
  { id: "peach", emoji: "🍑", name: "Peach", fill: "#c3d3ce" },
  { id: "star", emoji: "⭐", name: "Star", fill: "#1c525d" },
  { id: "mushroom", emoji: "🍄", name: "Shroom", fill: "#adb49c" },
  { id: "robot", emoji: "🤖", name: "Bot", fill: "#db704c" },
  { id: "sunflower", emoji: "🌻", name: "Sun", fill: "#b4aea6" },
  { id: "squid", emoji: "🦑", name: "Squid", fill: "#f8dbca" },
  { id: "croissant", emoji: "🥐", name: "Butter", fill: "#b6969d" },
  { id: "disco", emoji: "🪩", name: "Disco", fill: "#181e1d" },
];

/** Pill fills from the party-chat illustration — readable with ink text. */
export const POPPY_BUBBLES = [
  "#adb49c",
  "#f8dbca",
  "#db704c",
  "#c3d3ce",
  "#b6969d",
  "#d6d0c3",
  "#f6c453",
  "#9fd0de",
] as const;

const AVATAR_BUBBLE: Record<string, string> = {
  fox: "#c3d3ce",
  panda: "#adb49c",
  ghost: "#b6969d",
  alien: "#9fd0de",
  cat: "#d6d0c3",
  frog: "#f8dbca",
  moon: "#d6d0c3",
  fire: "#db704c",
  peach: "#f8dbca",
  star: "#f6c453",
  mushroom: "#adb49c",
  robot: "#db704c",
  sunflower: "#f6c453",
  squid: "#9fd0de",
  croissant: "#b6969d",
  disco: "#c3d3ce",
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function nextPoppy(seed: string, used: Set<string>, preferred?: string): string {
  if (preferred && !used.has(preferred)) return preferred;
  const start = hashSeed(seed) % POPPY_BUBBLES.length;
  for (let i = 0; i < POPPY_BUBBLES.length; i++) {
    const color = POPPY_BUBBLES[(start + i) % POPPY_BUBBLES.length];
    if (!used.has(color)) return color;
  }
  return preferred || POPPY_BUBBLES[start];
}

/** One poppy fill per person. Prefers their avatar color, then a free illustration swatch. */
export function assignBubbleColors(
  peers: Array<{ peerId: string; avatarId?: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const peer of peers) {
    if (!peer.peerId || map.has(peer.peerId)) continue;
    const color = nextPoppy(
      peer.peerId,
      used,
      peer.avatarId ? AVATAR_BUBBLE[peer.avatarId] : undefined,
    );
    used.add(color);
    map.set(peer.peerId, color);
  }
  return map;
}

/** Two rows of watch-party reactions. Glyphs stay on the wire; the overlay plays Noto live emoji. */
export const REACTION_LIVE = [
  { emoji: "😂", code: "1f602", label: "Crying laughing" },
  { emoji: "😭", code: "1f62d", label: "Sobbing" },
  { emoji: "😱", code: "1f631", label: "Scream" },
  { emoji: "🤯", code: "1f92f", label: "Mind blown" },
  { emoji: "🤩", code: "1f929", label: "Starstruck" },
  { emoji: "🫣", code: "1fae3", label: "Peeking" },
  { emoji: "🫠", code: "1fae0", label: "Melting" },
  { emoji: "😍", code: "1f60d", label: "Heart eyes" },
  { emoji: "🔥", code: "1f525", label: "Fire" },
  { emoji: "👏", code: "1f44f", label: "Clap" },
  { emoji: "💀", code: "1f480", label: "I'm dead" },
  { emoji: "👀", code: "1f440", label: "Eyes" },
  { emoji: "🍿", code: "1f37f", label: "Popcorn" },
  { emoji: "👻", code: "1f47b", label: "Ghost" },
  { emoji: "😴", code: "1f634", label: "Sleeping" },
  { emoji: "😡", code: "1f621", label: "Rage" },
  { emoji: "💔", code: "1f494", label: "Broken heart" },
  { emoji: "🎉", code: "1f389", label: "Party" },
] as const;

export type ReactionEmoji = (typeof REACTION_LIVE)[number]["emoji"];
export const REACTIONS: readonly ReactionEmoji[] = REACTION_LIVE.map((item) => item.emoji);

const REACTION_BY_EMOJI = Object.fromEntries(REACTION_LIVE.map((item) => [item.emoji, item])) as {
  [K in ReactionEmoji]: (typeof REACTION_LIVE)[number];
};

export function getReactionLive(emoji: string) {
  if (Object.prototype.hasOwnProperty.call(REACTION_BY_EMOJI, emoji)) {
    return REACTION_BY_EMOJI[emoji as ReactionEmoji];
  }
  return undefined;
}

export function reactionAssetUrl(file: string) {
  const path = `reactions/${file}`;
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch {
    // Storybook and plain pages load from /public.
  }
  return `/${path}`;
}

export function getAvatar(id?: string | null): Avatar {
  return AVATARS.find((item) => item.id === id) ?? AVATARS[0];
}

export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}
