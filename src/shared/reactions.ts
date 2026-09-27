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
    x: rand(22, 78),
    y: rand(58, 78),
    spin: randInt(-16, 16),
    delay: randInt(0, 240),
    size: randInt(34, 52),
    duration: randInt(1900, 2800),
    rise: randInt(160, 280),
    drift: randInt(-56, 56),
  };
}

/** A few emoji that pop, drift up, and fade — Instagram Live style. */
export function sprayBursts(emoji: string): ReactionBurst[] {
  const count = randInt(4, 7);
  return Array.from({ length: count }, () => makeBurst(emoji));
}

export function burstTtlMs(burst: ReactionBurst) {
  return burst.delay + burst.duration + 80;
}
