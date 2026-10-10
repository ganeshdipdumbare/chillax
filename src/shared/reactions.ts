import type { ReactionBurst } from "./types";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.round(rand(min, max));
}

/** Start along the bottom of the video player, then float up. */
export function makeBurst(emoji: string): ReactionBurst {
  const duration = randInt(2000, 2600);
  const delay = 0;
  return {
    id: crypto.randomUUID(),
    emoji,
    x: rand(8, 92),
    y: rand(84, 94),
    spin: randInt(-10, 10),
    delay,
    size: randInt(44, 56),
    duration,
    rise: randInt(220, 320),
    drift: randInt(-32, 32),
    until: Date.now() + delay + duration + 200,
  };
}

/** One live emoji pops, drifts up, and fades. */
export function sprayBursts(emoji: string): ReactionBurst[] {
  return [makeBurst(emoji)];
}

export function burstTtlMs(burst: ReactionBurst) {
  return burst.delay + burst.duration + 80;
}
