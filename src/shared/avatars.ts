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

export const REACTIONS = ["😂", "❤️", "🔥", "👏", "😮", "😭", "🎉", "💀", "👀", "🍿"] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export function getAvatar(id?: string | null): Avatar {
  return AVATARS.find((item) => item.id === id) ?? AVATARS[0];
}

export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}
