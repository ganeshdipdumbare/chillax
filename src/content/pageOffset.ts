import { OVERLAY_RESERVE } from "../shared/constants";

const STYLE_ID = "chillax-page-offset";
const HOST_ID = "chillax-root";

let resizeTimer = 0;

function offsetCss(): string {
  const space = `${OVERLAY_RESERVE}px`;
  return `
html.chillax-overlay-open {
  box-sizing: border-box !important;
  width: auto !important;
  max-width: none !important;
  margin-right: ${space} !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open body {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  margin-right: 0 !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open ytd-app,
html.chillax-overlay-open #content.ytd-app,
html.chillax-overlay-open #page-manager,
html.chillax-overlay-open ytd-page-manager,
html.chillax-overlay-open ytd-watch-flexy,
html.chillax-overlay-open #columns.ytd-watch-flexy,
html.chillax-overlay-open #primary.ytd-watch-flexy,
html.chillax-overlay-open #player,
html.chillax-overlay-open #player-container-outer,
html.chillax-overlay-open #player-container-inner,
html.chillax-overlay-open #player-container,
html.chillax-overlay-open #ytd-player,
html.chillax-overlay-open ytd-player,
html.chillax-overlay-open #appMountPoint {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open #masthead-container,
html.chillax-overlay-open ytd-masthead,
html.chillax-overlay-open #container.ytd-masthead {
  left: 0 !important;
  right: ${space} !important;
  width: auto !important;
  max-width: none !important;
}
html.chillax-overlay-open #full-bleed-container,
html.chillax-overlay-open #player-full-bleed-container,
html.chillax-overlay-open #player-theater-container,
html.chillax-overlay-open #player-wide-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #player-full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #player-full-bleed-container,
html.chillax-overlay-open #movie_player,
html.chillax-overlay-open .html5-video-player,
html.chillax-overlay-open .html5-video-container {
  position: relative !important;
  width: 100% !important;
  max-width: 100% !important;
  left: 0 !important;
  right: 0 !important;
}
html.chillax-overlay-open ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #player-full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #player-full-bleed-container,
html.chillax-overlay-open #player-theater-container,
html.chillax-overlay-open #player-wide-container {
  height: auto !important;
  max-height: none !important;
  aspect-ratio: 16 / 9;
}
html.chillax-overlay-open video.html5-main-video,
html.chillax-overlay-open video.video-stream {
  max-width: 100% !important;
  left: 0 !important;
}
html.chillax-overlay-open .watch-video,
html.chillax-overlay-open .watch-video--player-view,
html.chillax-overlay-open .watch-video--player-view-container,
html.chillax-overlay-open [data-uia="player"],
html.chillax-overlay-open [data-uia="watch-video"],
html.chillax-overlay-open .nfp,
html.chillax-overlay-open .nfp.AkiraPlayer {
  width: 100% !important;
  max-width: 100% !important;
}
`;
}

function exitYouTubeTheater() {
  const flexy = document.querySelector("ytd-watch-flexy");
  if (!flexy) return;
  if (!flexy.hasAttribute("theater") && !flexy.hasAttribute("full-bleed-player")) return;
  document.querySelector<HTMLElement>(".ytp-size-button")?.click();
}

function nudgePlayerLayout() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 80);
}

export function pushPageOffset(_platform: "youtube" | "netflix", open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  const shouldOpen = open && !fullscreen;
  const root = document.documentElement;
  root.classList.toggle("chillax-overlay-open", shouldOpen);
  root.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);
  root.style.marginRight = shouldOpen ? `${OVERLAY_RESERVE}px` : "";

  const host = document.getElementById(HOST_ID);
  host?.classList.toggle("is-fullscreen", fullscreen);
  host?.classList.toggle("is-open", shouldOpen);
  if (host) host.style.width = shouldOpen ? `${OVERLAY_RESERVE}px` : "0px";

  const existing = document.getElementById(STYLE_ID);
  if (!shouldOpen) {
    existing?.remove();
    nudgePlayerLayout();
    return;
  }
  if (shouldOpen) exitYouTubeTheater();
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss();
  if (!existing) (document.head || root).appendChild(style);
  nudgePlayerLayout();
}

export function watchFullscreen(platform: "youtube" | "netflix", isOpen: () => boolean) {
  const sync = () => pushPageOffset(platform, isOpen());
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("yt-navigate-finish", sync);
}
