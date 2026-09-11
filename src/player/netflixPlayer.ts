import { MSG_SOURCE_NFLX_ISOLATED, MSG_SOURCE_NFLX_MAIN, NETFLIX_DRIFT_SECONDS } from "../shared/constants";
import type { PlayerState } from "../shared/types";
import type { PlayerAdapter } from "./types";

function videoEl(): HTMLVideoElement | null {
  return document.querySelector("video");
}

export class NetflixPlayer implements PlayerAdapter {
  platform = "netflix" as const;
  driftThreshold = NETFLIX_DRIFT_SECONDS;

  private post(type: string, extra?: Record<string, unknown>) {
    window.postMessage({ source: MSG_SOURCE_NFLX_ISOLATED, type, ...extra }, "*");
  }

  getContentId(): string | null {
    return location.pathname.match(/\/watch\/(\d+)/)?.[1] ?? null;
  }

  isWatchPage(): boolean {
    return Boolean(this.getContentId());
  }

  getState(): PlayerState | null {
    const video = videoEl();
    if (!video || video.readyState < 1 || Number.isNaN(video.currentTime)) return null;
    return { paused: video.paused, time: video.currentTime };
  }

  async play(): Promise<void> {
    this.post("play");
    try {
      await videoEl()?.play();
    } catch {
      // MAIN-world play() is the real control path.
    }
  }

  async pause(): Promise<void> {
    this.post("pause");
    videoEl()?.pause();
  }

  async seek(timeSeconds: number): Promise<void> {
    this.post("seek", { time: timeSeconds });
    const video = videoEl();
    if (video) video.currentTime = timeSeconds;
  }

  isAdPlaying(): boolean {
    return Boolean(
      document.querySelector(".watch-video--ads-overlay") ||
        document.querySelector("[data-uia='ads-overlay']") ||
        document.querySelector(".ad-ui"),
    );
  }

  onChange(handler: () => void): () => void {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string } | null;
      if (event.source !== window || data?.source !== MSG_SOURCE_NFLX_MAIN) return;
      if (data.type === "change") handler();
    };
    window.addEventListener("message", onMessage);
    const videoEvents = ["play", "pause", "seeked"] as const;
    const attach = (video: HTMLVideoElement | null) => {
      if (!video) return () => undefined;
      for (const ev of videoEvents) video.addEventListener(ev, handler);
      return () => {
        for (const ev of videoEvents) video.removeEventListener(ev, handler);
      };
    };
    let detach = attach(videoEl());
    const timer = window.setInterval(() => {
      detach();
      detach = attach(videoEl());
    }, 2000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
      detach();
    };
  }

  onNavigate(handler: () => void): () => void {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string } | null;
      if (event.source !== window || data?.source !== MSG_SOURCE_NFLX_MAIN) return;
      if (data.type === "navigate") handler();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }
}
