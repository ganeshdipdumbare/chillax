export type Avatar = {
  id: string;
  emoji: string;
  name: string;
  from: string;
  to: string;
};

export const AVATARS: Avatar[] = [
  { id: "fox", emoji: "🦊", name: "Fox", from: "#ff7a45", to: "#7a1d12" },
  { id: "panda", emoji: "🐼", name: "Panda", from: "#e8eef7", to: "#2a3344" },
  { id: "ghost", emoji: "👻", name: "Ghost", from: "#f4f1ff", to: "#6b5cff" },
  { id: "alien", emoji: "👽", name: "Alien", from: "#b8ff6a", to: "#1b4d2a" },
  { id: "cat", emoji: "🐱", name: "Cat", from: "#ffd28a", to: "#b25a2b" },
  { id: "frog", emoji: "🐸", name: "Frog", from: "#9cff7a", to: "#1f6a3a" },
  { id: "moon", emoji: "🌙", name: "Moon", from: "#ffe9a8", to: "#3a2a78" },
  { id: "fire", emoji: "🔥", name: "Ember", from: "#ffb347", to: "#c4292e" },
  { id: "peach", emoji: "🍑", name: "Peach", from: "#ffb4c8", to: "#c23b5a" },
  { id: "star", emoji: "⭐", name: "Star", from: "#fff1a8", to: "#c97a12" },
  { id: "mushroom", emoji: "🍄", name: "Shroom", from: "#ff6b7a", to: "#4a1020" },
  { id: "robot", emoji: "🤖", name: "Bot", from: "#9ad7ff", to: "#214a6b" },
  { id: "sunflower", emoji: "🌻", name: "Sun", from: "#ffe36b", to: "#2f6b32" },
  { id: "squid", emoji: "🦑", name: "Squid", from: "#ff7ad9", to: "#4b1570" },
  { id: "croissant", emoji: "🥐", name: "Butter", from: "#ffd19a", to: "#8a4b1f" },
  { id: "disco", emoji: "🪩", name: "Disco", from: "#d4f4ff", to: "#5b2dff" },
];

export const REACTIONS = ["😂", "❤️", "🔥", "👏", "😮", "😭", "🎉", "💀", "👀", "🍿"] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export function getAvatar(id?: string | null): Avatar {
  return AVATARS.find((item) => item.id === id) ?? AVATARS[0];
}

export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}
