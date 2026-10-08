import { HTML5_DRIFT_SECONDS } from "../shared/constants";
import type { Platform } from "../shared/types";
import type { PlayerState } from "../shared/types";
import type { PlayerAdapter } from "./types";

const MEDIA_EVENTS = ["play", "playing", "pause", "seeked", "ratechange"] as const;

function visibleArea(el: HTMLVideoElement): number {
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return 0;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return 0;
  }
  return rect.width * rect.height;
}

/** Pick the largest visible video on the page (typical streaming player). */
export function pickVideo(): HTMLVideoElement | null {
  const videos = [...document.querySelectorAll("video")];
  let best: HTMLVideoElement | null = null;
  let bestArea = 0;
  for (const video of videos) {
    const area = visibleArea(video);
    if (area > bestArea) {
      best = video;
      bestArea = area;
    }
  }
  if (best) return best;
  return videos[0] ?? null;
}

export type Html5PlayerOptions = {
  platform: Platform;
  driftThreshold?: number;
  getContentId: () => string | null;
  isWatchPage?: () => boolean;
  isPlayerOpen?: () => boolean;
  isAdPlaying?: () => boolean;
  /** When false, seek is a no-op (e.g. Twitch live). Default true. */
  canSeek?: () => boolean;
};

export class Html5Player implements PlayerAdapter {
  platform: Platform;
  driftThreshold: number;
  private readonly opts: Html5PlayerOptions;

  constructor(opts: Html5PlayerOptions) {
    this.opts = opts;
    this.platform = opts.platform;
    this.driftThreshold = opts.driftThreshold ?? HTML5_DRIFT_SECONDS;
  }

  getContentId(): string | null {
    return this.opts.getContentId();
  }

  isWatchPage(): boolean {
    if (this.opts.isWatchPage) return this.opts.isWatchPage();
    return Boolean(this.getContentId());
  }

  isPlayerOpen(): boolean {
    return this.opts.isPlayerOpen?.() ?? true;
  }

  getState(): PlayerState | null {
    const video = pickVideo();
    if (!video || Number.isNaN(video.currentTime)) return null;
    return { paused: video.paused, time: video.currentTime };
  }

  async play(): Promise<void> {
    const video = pickVideo();
    if (video) await video.play();
  }

  async pause(): Promise<void> {
    pickVideo()?.pause();
  }

  async seek(timeSeconds: number): Promise<void> {
    if (this.opts.canSeek && !this.opts.canSeek()) return;
    const video = pickVideo();
    if (video) video.currentTime = timeSeconds;
  }

  isAdPlaying(): boolean {
    return this.opts.isAdPlaying?.() ?? false;
  }

  onChange(handler: () => void): () => void {
    let video: HTMLVideoElement | null = null;
    let lastAd = this.isAdPlaying();
    const bind = () => {
      const next = pickVideo();
      if (next === video) return;
      if (video) {
        for (const ev of MEDIA_EVENTS) video.removeEventListener(ev, handler);
      }
      video = next;
      if (video) {
        for (const ev of MEDIA_EVENTS) video.addEventListener(ev, handler);
      }
    };
    bind();
    const timer = window.setInterval(() => {
      bind();
      const ads = this.isAdPlaying();
      if (ads !== lastAd) {
        lastAd = ads;
        handler();
      }
    }, 400);
    return () => {
      window.clearInterval(timer);
      if (video) {
        for (const ev of MEDIA_EVENTS) video.removeEventListener(ev, handler);
      }
    };
  }

  onNavigate(handler: () => void): () => void {
    let last = location.href;
    const check = () => {
      if (location.href === last) return;
      last = location.href;
      handler();
    };
    window.addEventListener("popstate", check);
    const timer = window.setInterval(check, 1000);
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("popstate", check);
      window.clearInterval(timer);
      observer.disconnect();
    };
  }
}
