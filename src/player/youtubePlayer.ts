import { YT_DRIFT_SECONDS } from "../shared/constants";
import type { PlayerState } from "../shared/types";
import type { PlayerAdapter } from "./types";

type YTMoviePlayer = HTMLElement & {
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (time: number, allowSeekAhead?: boolean) => void;
  getCurrentTime?: () => number;
  getPlayerState?: () => number;
};

function moviePlayer(): YTMoviePlayer | null {
  return document.querySelector("#movie_player");
}

function videoEl(): HTMLVideoElement | null {
  const player = moviePlayer();
  return (player?.querySelector("video") as HTMLVideoElement | null) ??
    document.querySelector("video.html5-main-video") ??
    document.querySelector("video");
}

export class YoutubePlayer implements PlayerAdapter {
  platform = "youtube" as const;
  driftThreshold = YT_DRIFT_SECONDS;

  getContentId(): string | null {
    const url = new URL(location.href);
    const v = url.searchParams.get("v");
    if (v) return v;
    const shorts = location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
    return shorts?.[1] ?? null;
  }

  isWatchPage(): boolean {
    return Boolean(this.getContentId());
  }

  getState(): PlayerState | null {
    const player = moviePlayer();
    const video = videoEl();
    const time = player?.getCurrentTime?.() ?? video?.currentTime;
    if (typeof time !== "number" || Number.isNaN(time)) return null;
    const state = player?.getPlayerState?.();
    const paused =
      state === 1 || state === 3
        ? false
        : state === 2 || state === 0 || state === 5
          ? true
          : video?.paused ?? true;
    return { paused, time };
  }

  async play(): Promise<void> {
    const player = moviePlayer();
    if (player?.playVideo) {
      player.playVideo();
      return;
    }
    const video = videoEl();
    if (video) await video.play();
  }

  async pause(): Promise<void> {
    const player = moviePlayer();
    if (player?.pauseVideo) {
      player.pauseVideo();
      return;
    }
    videoEl()?.pause();
  }

  async seek(timeSeconds: number): Promise<void> {
    const player = moviePlayer();
    if (player?.seekTo) {
      player.seekTo(timeSeconds, true);
      return;
    }
    const video = videoEl();
    if (video) video.currentTime = timeSeconds;
  }

  isAdPlaying(): boolean {
    const player = moviePlayer();
    return Boolean(
      player?.classList.contains("ad-showing") ||
        player?.classList.contains("ad-interrupting") ||
        document.querySelector(".ytp-ad-player-overlay"),
    );
  }

  onChange(handler: () => void): () => void {
    let video: HTMLVideoElement | null = null;
    const events = ["play", "playing", "pause", "seeked", "ratechange"] as const;
    const bind = () => {
      const next = videoEl();
      if (next === video) return;
      if (video) {
        for (const ev of events) video.removeEventListener(ev, handler);
      }
      video = next;
      if (video) {
        for (const ev of events) video.addEventListener(ev, handler);
      }
    };
    bind();
    const timer = window.setInterval(bind, 1500);
    return () => {
      window.clearInterval(timer);
      if (video) {
        for (const ev of events) video.removeEventListener(ev, handler);
      }
    };
  }

  onNavigate(handler: () => void): () => void {
    document.addEventListener("yt-navigate-finish", handler);
    window.addEventListener("yt-page-data-updated", handler);
    return () => {
      document.removeEventListener("yt-navigate-finish", handler);
      window.removeEventListener("yt-page-data-updated", handler);
    };
  }
}
