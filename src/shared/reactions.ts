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
    x: rand(4, 88),
    spin: randInt(-48, 48),
    delay: randInt(0, 520),
    size: randInt(24, 54),
    drift: randInt(-140, 140),
    sway: randInt(-56, 56),
    duration: randInt(2200, 4200),
    spinEnd: randInt(8, 42) * (Math.random() < 0.5 ? -1 : 1),
  };
}

/** Handful of the same emoji with independent timing and paths. */
export function sprayBursts(emoji: string): ReactionBurst[] {
  const count = randInt(5, 9);
  return Array.from({ length: count }, () => makeBurst(emoji));
}

export function burstTtlMs(burst: ReactionBurst) {
  return burst.delay + burst.duration + 80;
}
