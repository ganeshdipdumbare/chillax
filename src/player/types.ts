import type { PlayerState } from "../shared/types";

export type PlayerAdapter = {
  platform: "youtube" | "netflix";
  driftThreshold: number;
  getContentId(): string | null;
  isWatchPage(): boolean;
  getState(): PlayerState | null;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(timeSeconds: number): Promise<void>;
  isAdPlaying(): boolean;
  onChange(handler: () => void): () => void;
  onNavigate(handler: () => void): () => void;
};

export function shouldSeek(
  localTime: number,
  hostTime: number,
  threshold: number,
): boolean {
  return Math.abs(localTime - hostTime) > threshold;
}

export async function applyHostSync(
  adapter: PlayerAdapter,
  host: { paused: boolean; time: number; sentAt?: number },
  applying: { current: boolean },
): Promise<"ok" | "ad" | "gesture"> {
  if (adapter.isAdPlaying()) return "ad";
  const local = adapter.getState();
  if (!local) return "ok";
  let target = host.time;
  if (!host.paused && host.sentAt) {
    const delay = Math.min(8, Math.max(0, (Date.now() - host.sentAt) / 1000));
    target += delay;
  }
  const needsSeek = shouldSeek(local.time, target, adapter.driftThreshold);
  if (!needsSeek && host.paused === local.paused) return "ok";
  applying.current = true;
  try {
    if (host.paused) {
      if (!local.paused) await adapter.pause();
      if (needsSeek) await adapter.seek(target);
      await adapter.pause();
    } else {
      if (needsSeek) await adapter.seek(target);
      const after = adapter.getState();
      if (after?.paused ?? local.paused) {
        try {
          await adapter.play();
        } catch {
          applying.current = false;
          return "gesture";
        }
      }
    }
  } finally {
    window.setTimeout(() => {
      applying.current = false;
    }, 500);
  }
  return "ok";
}
