/**
 * Runs in the Netflix page MAIN world. Speaks only via window.postMessage.
 * Controls the in-page player; it does not read or decrypt video bytes.
 */
const SOURCE_IN = "chillax-isolated";
const SOURCE_OUT = "chillax-main";

type NetflixPlayer = {
  play?: () => void;
  pause?: () => void;
  seek?: (ms: number) => void;
  getCurrentTime?: () => number;
  getCurrentTimeMs?: () => number;
  isPaused?: () => boolean;
  paused?: boolean | (() => boolean);
  getPaused?: () => boolean;
};

type NetflixAPI = {
  appContext?: {
    state?: {
      playerApp?: {
        getAPI?: () => {
          videoPlayer?: {
            getAllPlayerSessionIds?: () => string[];
            getVideoPlayerBySessionId?: (id: string) => NetflixPlayer;
          };
        };
      };
    };
  };
};

function netflixRoot(): NetflixAPI | undefined {
  return (window as unknown as { netflix?: NetflixAPI }).netflix;
}

function getPlayer(): NetflixPlayer | null {
  try {
    const videoPlayer = netflixRoot()?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
    const ids = videoPlayer?.getAllPlayerSessionIds?.() ?? [];
    if (!ids.length || !videoPlayer?.getVideoPlayerBySessionId) return null;
    return videoPlayer.getVideoPlayerBySessionId(ids[ids.length - 1]) ?? null;
  } catch {
    return null;
  }
}

function videoEl(): HTMLVideoElement | null {
  return document.querySelector("video");
}

function isPaused(player: NetflixPlayer | null, video: HTMLVideoElement | null): boolean {
  if (player) {
    if (typeof player.isPaused === "function") return player.isPaused();
    if (typeof player.getPaused === "function") return player.getPaused();
    if (typeof player.paused === "function") return player.paused();
    if (typeof player.paused === "boolean") return player.paused;
  }
  return video?.paused ?? true;
}

function currentTimeSeconds(player: NetflixPlayer | null, video: HTMLVideoElement | null): number {
  if (player) {
    const raw = player.getCurrentTimeMs?.() ?? player.getCurrentTime?.();
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw / 1000;
    }
  }
  return video?.currentTime ?? 0;
}

function contentId(): string | null {
  return location.pathname.match(/\/watch\/(\d+)/)?.[1] ?? null;
}

function adPlaying(): boolean {
  return Boolean(
    document.querySelector(".watch-video--ads-overlay") ||
      document.querySelector("[data-uia='ads-overlay']") ||
      document.querySelector(".ad-ui") ||
      document.querySelector(".watch-video--ad-container"),
  );
}

function post(data: Record<string, unknown>) {
  window.postMessage({ source: SOURCE_OUT, ...data }, "*");
}

function sendState(requestId?: number) {
  const player = getPlayer();
  const video = videoEl();
  post({
    type: "state",
    requestId,
    paused: isPaused(player, video),
    time: currentTimeSeconds(player, video),
    contentId: contentId(),
    adPlaying: adPlaying(),
    hasPlayer: Boolean(player || video),
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; type?: string; time?: number; requestId?: number } | null;
  if (!data || data.source !== SOURCE_IN) return;
  const player = getPlayer();
  const video = videoEl();
  switch (data.type) {
    case "play":
      player?.play?.();
      if (!player) void video?.play();
      break;
    case "pause":
      player?.pause?.();
      if (!player) video?.pause();
      break;
    case "seek": {
      const seconds = data.time ?? 0;
      if (player?.seek) player.seek(seconds * 1000);
      else if (video) video.currentTime = seconds;
      break;
    }
    case "getState":
      sendState(data.requestId);
      break;
    default:
      break;
  }
});

let lastSignature = "";
const tick = () => {
  const player = getPlayer();
  const video = videoEl();
  const signature = [
    contentId() ?? "",
    isPaused(player, video) ? "1" : "0",
    Math.round(currentTimeSeconds(player, video)),
    location.href,
  ].join("|");
  if (signature !== lastSignature) {
    lastSignature = signature;
    post({ type: "change" });
  }
};
window.setInterval(tick, 500);

window.addEventListener("popstate", () => post({ type: "navigate" }));
const pushState = history.pushState.bind(history);
const replaceState = history.replaceState.bind(history);
history.pushState = function pushStatePatched(...args) {
  const result = pushState(...args);
  post({ type: "navigate" });
  return result;
};
history.replaceState = function replaceStatePatched(...args) {
  const result = replaceState(...args);
  post({ type: "navigate" });
  return result;
};
