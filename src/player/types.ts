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
  host: { paused: boolean; time: number },
  applying: { current: boolean },
): Promise<"ok" | "ad" | "gesture"> {
  if (adapter.isAdPlaying()) return "ad";
  const local = adapter.getState();
  if (!local) return "ok";
  applying.current = true;
  try {
    if (shouldSeek(local.time, host.time, adapter.driftThreshold)) {
      await adapter.seek(host.time);
    }
    if (host.paused) {
      await adapter.pause();
    } else {
      try {
        await adapter.play();
      } catch {
        applying.current = false;
        return "gesture";
      }
    }
  } finally {
    window.setTimeout(() => {
      applying.current = false;
    }, 400);
  }
  return "ok";
}
