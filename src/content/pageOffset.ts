import { OVERLAY_RESERVE } from "../shared/constants";

const STYLE_ID = "chillax-page-offset";
const HOST_ID = "chillax-root";
const PINNED_PROPS = [
  "position",
  "left",
  "right",
  "top",
  "bottom",
  "width",
  "height",
  "object-fit",
] as const;

let resizeTimer = 0;
let resizeTimer2 = 0;
let layoutGen = 0;
let hostGuard: MutationObserver | null = null;
let fsLayoutGuard: MutationObserver | null = null;
let pinnedEls: HTMLElement[] = [];

function offsetCss(): string {
  const space = `${OVERLAY_RESERVE}px`;
  return `
html.chillax-overlay-open:not(.chillax-fs) {
  box-sizing: border-box !important;
  width: auto !important;
  max-width: none !important;
  margin-right: ${space} !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open:not(.chillax-fs) body {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  margin-right: 0 !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open:not(.chillax-fs) ytd-app,
html.chillax-overlay-open:not(.chillax-fs) #content.ytd-app,
html.chillax-overlay-open:not(.chillax-fs) #page-manager,
html.chillax-overlay-open:not(.chillax-fs) ytd-page-manager,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy,
html.chillax-overlay-open:not(.chillax-fs) #columns.ytd-watch-flexy,
html.chillax-overlay-open:not(.chillax-fs) #primary.ytd-watch-flexy,
html.chillax-overlay-open:not(.chillax-fs) #player,
html.chillax-overlay-open:not(.chillax-fs) #player-container-outer,
html.chillax-overlay-open:not(.chillax-fs) #player-container-inner,
html.chillax-overlay-open:not(.chillax-fs) #player-container,
html.chillax-overlay-open:not(.chillax-fs) #ytd-player,
html.chillax-overlay-open:not(.chillax-fs) ytd-player,
html.chillax-overlay-open:not(.chillax-fs) #appMountPoint {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open:not(.chillax-fs) #masthead-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-masthead,
html.chillax-overlay-open:not(.chillax-fs) #container.ytd-masthead {
  left: 0 !important;
  right: ${space} !important;
  width: auto !important;
  max-width: none !important;
}
html.chillax-overlay-open:not(.chillax-fs) #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) #player-full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) #player-theater-container,
html.chillax-overlay-open:not(.chillax-fs) #player-wide-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) #movie_player,
html.chillax-overlay-open:not(.chillax-fs) .html5-video-player,
html.chillax-overlay-open:not(.chillax-fs) .html5-video-container {
  position: relative !important;
  width: 100% !important;
  max-width: 100% !important;
  left: 0 !important;
  right: 0 !important;
}
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) #player-theater-container,
html.chillax-overlay-open:not(.chillax-fs) #player-wide-container {
  height: auto !important;
  max-height: none !important;
  aspect-ratio: 16 / 9;
}
html.chillax-overlay-open:not(.chillax-fs) video.html5-main-video,
html.chillax-overlay-open:not(.chillax-fs) video.video-stream {
  max-width: 100% !important;
  left: 0 !important;
}
html.chillax-overlay-open:not(.chillax-fs) .watch-video,
html.chillax-overlay-open:not(.chillax-fs) .watch-video--player-view,
html.chillax-overlay-open:not(.chillax-fs) [data-uia="player"],
html.chillax-overlay-open:not(.chillax-fs) .nfp,
html.chillax-overlay-open:not(.chillax-fs) .nfp.AkiraPlayer {
  width: 100% !important;
  max-width: 100% !important;
}
html.chillax-overlay-open.chillax-fs :fullscreen .ytp-chrome-bottom,
html.chillax-overlay-open.chillax-fs :fullscreen .ytp-chrome-top,
html.chillax-overlay-open.chillax-fs :fullscreen .ytp-gradient-bottom,
html.chillax-overlay-open.chillax-fs :fullscreen .ytp-gradient-top {
  left: 0 !important;
  width: calc(100% - ${space}) !important;
  right: auto !important;
}
`;
}

function exitYouTubeTheater() {
  if (document.fullscreenElement) return;
  const flexy = document.querySelector("ytd-watch-flexy");
  if (!flexy) return;
  if (!flexy.hasAttribute("theater") && !flexy.hasAttribute("full-bleed-player")) return;
  document.querySelector<HTMLElement>(".ytp-size-button")?.click();
}

function youtubePlayer() {
  return document.querySelector("#movie_player") as
    | (HTMLElement & { setSize?: (w: number, h: number) => void })
    | null;
}

function sizePlayerToReserve(reserve: number) {
  const gen = ++layoutGen;
  const apply = () => {
    if (gen !== layoutGen) return;
    if (document.fullscreenElement) {
      if (reserve > 0) {
        clearPinnedStyles();
        applyFullscreenPlayerLayout(reserve);
      } else {
        const { width, height } = leftoverSize(0);
        youtubePlayer()?.setSize?.(width, height);
      }
    }
    window.dispatchEvent(new Event("resize"));
  };
  apply();
  window.clearTimeout(resizeTimer);
  window.clearTimeout(resizeTimer2);
  resizeTimer = window.setTimeout(apply, 50);
  resizeTimer2 = window.setTimeout(apply, 220);
}

function fullscreenTarget(): Element {
  const fs = document.fullscreenElement;
  if (!fs) return document.documentElement;
  if (fs instanceof HTMLVideoElement) return fs.parentElement || fs;
  return fs;
}

function placeHost() {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  const target = fullscreenTarget();
  if (host.parentElement !== target) target.appendChild(host);
}

function watchHostParent() {
  hostGuard?.disconnect();
  hostGuard = null;
  const fs = document.fullscreenElement;
  if (!fs) return;
  hostGuard = new MutationObserver(() => {
    const host = document.getElementById(HOST_ID);
    if (host && document.fullscreenElement && host.parentElement !== fullscreenTarget()) {
      placeHost();
    }
  });
  hostGuard.observe(fs, { childList: true });
}

function leftoverSize(reserve: number) {
  return {
    width: Math.max(160, window.innerWidth - reserve),
    height: window.innerHeight,
  };
}

function pinPx(el: HTMLElement, props: Record<string, string>) {
  for (const [prop, value] of Object.entries(props)) {
    el.style.setProperty(prop, value, "important");
  }
  pinnedEls.push(el);
}

function clearPinnedStyles() {
  for (const el of pinnedEls) {
    for (const prop of PINNED_PROPS) el.style.removeProperty(prop);
  }
  pinnedEls = [];
}

function applyFullscreenPlayerLayout(reserve: number) {
  const fs = document.fullscreenElement;
  if (!(fs instanceof HTMLElement)) return;
  const { width, height } = leftoverSize(reserve);
  youtubePlayer()?.setSize?.(width, height);

  const container =
    fs.querySelector<HTMLElement>(".html5-video-container") ||
    fs.querySelector<HTMLElement>("[data-uia='video-canvas']");
  if (container) {
    pinPx(container, {
      position: "absolute",
      left: "0px",
      top: "0px",
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  const video = fs.querySelector<HTMLVideoElement>("video");
  if (video && video !== fs) {
    pinPx(video, {
      left: "0px",
      top: "0px",
      width: `${width}px`,
      height: `${height}px`,
      "object-fit": "contain",
    });
  }

  for (const sel of [
    ".ytp-chrome-bottom",
    ".ytp-chrome-top",
    ".ytp-gradient-bottom",
    ".ytp-gradient-top",
  ]) {
    fs.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      pinPx(el, {
        left: "0px",
        width: `${width}px`,
        right: "auto",
      });
    });
  }
}

function watchFullscreenLayout(active: boolean) {
  fsLayoutGuard?.disconnect();
  fsLayoutGuard = null;
  clearPinnedStyles();
  const fs = document.fullscreenElement;
  if (!active || !(fs instanceof HTMLElement)) return;
  applyFullscreenPlayerLayout(OVERLAY_RESERVE);
  const width = `${leftoverSize(OVERLAY_RESERVE).width}px`;
  fsLayoutGuard = new MutationObserver(() => {
    if (!document.fullscreenElement) return;
    const container = document.fullscreenElement.querySelector<HTMLElement>(
      ".html5-video-container, [data-uia='video-canvas']",
    );
    if (
      container &&
      container.style.width === width &&
      container.style.getPropertyPriority("width") === "important"
    ) {
      return;
    }
    clearPinnedStyles();
    applyFullscreenPlayerLayout(OVERLAY_RESERVE);
  });
  fsLayoutGuard.observe(fs, {
    attributes: true,
    attributeFilter: ["style"],
    subtree: true,
    childList: true,
  });
}

export function pushPageOffset(_platform: "youtube" | "netflix", open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  placeHost();
  watchHostParent();

  const root = document.documentElement;
  root.classList.toggle("chillax-overlay-open", open);
  root.classList.toggle("chillax-fs", fullscreen);
  root.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);
  root.style.marginRight = open && !fullscreen ? `${OVERLAY_RESERVE}px` : "";

  const host = document.getElementById(HOST_ID);
  host?.classList.toggle("is-fullscreen", fullscreen);
  host?.classList.toggle("is-open", open);
  if (host) {
    host.style.position = fullscreen ? "absolute" : "fixed";
    host.style.width = open ? `${OVERLAY_RESERVE}px` : "0px";
  }

  const existing = document.getElementById(STYLE_ID);
  if (!open) {
    existing?.remove();
    watchFullscreenLayout(false);
    sizePlayerToReserve(0);
    return;
  }
  if (!fullscreen) {
    watchFullscreenLayout(false);
    exitYouTubeTheater();
  }
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss();
  if (!existing) (document.head || root).appendChild(style);
  if (fullscreen) watchFullscreenLayout(true);
  sizePlayerToReserve(fullscreen ? OVERLAY_RESERVE : 0);
}

export function watchFullscreen(platform: "youtube" | "netflix", isOpen: () => boolean) {
  const sync = () => pushPageOffset(platform, isOpen());
  document.addEventListener("fullscreenchange", sync, true);
  document.addEventListener("webkitfullscreenchange", sync, true);
  document.addEventListener("yt-navigate-finish", sync);
}
