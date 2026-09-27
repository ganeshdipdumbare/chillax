import type { ReactionBurst } from "./types";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.round(rand(min, max));
}

export function makeBurst(emoji: string): ReactionBurst {
  return {
    id: crypto.randomUUID(),
    emoji,
    x: rand(18, 82),
    y: rand(28, 72),
    spin: randInt(-14, 14),
    delay: randInt(0, 180),
    size: randInt(36, 56),
    duration: randInt(900, 1400),
  };
}

/** A few of the same emoji that pop in place, then fade (Instagram-style). */
export function sprayBursts(emoji: string): ReactionBurst[] {
  const count = randInt(3, 5);
  return Array.from({ length: count }, () => makeBurst(emoji));
}

export function burstTtlMs(burst: ReactionBurst) {
  return burst.delay + burst.duration + 60;
}
