import type { ReactionBurst } from "./types";

export function makeBurst(emoji: string, stagger = 0): ReactionBurst {
  return {
    id: crypto.randomUUID(),
    emoji,
    x: 10 + Math.random() * 72,
    spin: Math.round(-16 + Math.random() * 32),
    wobble: stagger + Math.round(Math.random() * 80),
    size: 30 + Math.round(Math.random() * 22),
    drift: Math.round(-64 + Math.random() * 128),
  };
}

export function sprayBursts(emoji: string): ReactionBurst[] {
  const count = 8 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, index) => makeBurst(emoji, index * 42));
}

export function burstTtlMs(burst: ReactionBurst) {
  return 3400 + burst.wobble;
}
