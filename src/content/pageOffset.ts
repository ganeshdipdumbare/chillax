import { OVERLAY_RESERVE } from "../shared/constants";
import { getState } from "../shared/store";

const STYLE_ID = "chillax-page-offset";
const LOUNGE_STYLE_ID = "chillax-lounge-hide";
const HOST_ID = "chillax-root";

let resizeTimer = 0;
let restoreTimer = 0;
let theaterTimer = 0;
let windowSyncTimer = 0;
let layoutGen = 0;
let ignoreWindowResize = false;
let hostGuard: MutationObserver | null = null;

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
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #player-full-bleed-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #player-theater-container,
html.chillax-overlay-open:not(.chillax-fs) ytd-watch-flexy[theater] #player-wide-container {
  position: relative !important;
  width: calc(100vw - ${space}) !important;
  max-width: calc(100vw - ${space}) !important;
  left: 0 !important;
  right: auto !important;
}
html.chillax-overlay-open .watch-video,
html.chillax-overlay-open .watch-video--player-view,
html.chillax-overlay-open [data-uia="player"],
html.chillax-overlay-open .nfp,
html.chillax-overlay-open .nfp.AkiraPlayer,
html.chillax-overlay-open.chillax-fs #movie_player,
html.chillax-overlay-open.chillax-fs #ytd-player,
html.chillax-overlay-open.chillax-fs #player-container,
html.chillax-overlay-open.chillax-fs #player-full-bleed-container,
html.chillax-overlay-open.chillax-fs #full-bleed-container {
  width: calc(100vw - ${space}) !important;
  max-width: calc(100vw - ${space}) !important;
  left: 0 !important;
  right: auto !important;
}
`;
}

function loungeCss(): string {
  return `
html.chillax-lounge {
  --ytd-mini-guide-width: 0px !important;
  --ytd-guide-width: 0px !important;
}
html.chillax-lounge ytd-mini-guide-renderer,
html.chillax-lounge #guide,
html.chillax-lounge tp-yt-app-drawer#guide,
html.chillax-lounge ytd-guide-renderer,
html.chillax-lounge #guide-spacer,
html.chillax-lounge #guide-wrapper {
  display: none !important;
}
html.chillax-lounge #content.ytd-app,
html.chillax-lounge ytd-page-manager,
html.chillax-lounge #page-manager {
  margin-left: 0 !important;
  padding-left: 0 !important;
  left: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}
`;
}

function setInjectedStyle(id: string, css: string | null) {
  const existing = document.getElementById(id);
  if (!css) {
    existing?.remove();
    return;
  }
  const style = existing ?? document.createElement("style");
  style.id = id;
  style.textContent = css;
  if (!existing) (document.head || document.documentElement).appendChild(style);
}

function collapseYouTubeGuide() {
  const drawer = document.querySelector("tp-yt-app-drawer#guide");
  if (!drawer?.hasAttribute("opened")) return;
  document.querySelector<HTMLElement>("#guide-button, #guide-button-icon, ytd-masthead #guide-button")?.click();
}

function exitYouTubeTheater() {
  if (document.fullscreenElement) return;
  const flexy = document.querySelector("ytd-watch-flexy");
  if (!flexy) return;
  if (!flexy.hasAttribute("theater") && !flexy.hasAttribute("full-bleed-player")) return;
  document.querySelector<HTMLElement>(".ytp-size-button")?.click();
}

function scheduleExitTheater() {
  window.clearTimeout(theaterTimer);
  exitYouTubeTheater();
  theaterTimer = window.setTimeout(exitYouTubeTheater, 280);
}

function youtubePlayer() {
  return document.querySelector("#movie_player") as
    | (HTMLElement & { setSize?: (w: number, h: number) => void })
    | null;
}

function layoutHost(
  host: HTMLElement,
  mode: "hidden" | "lounge" | "party" | "fullscreen",
) {
  host.style.pointerEvents = "none";
  host.style.background = "transparent";
  host.style.margin = "0";
  host.style.flex = "none";
  host.style.maxWidth = "none";
  host.style.maxHeight = "none";
  if (mode === "hidden") {
    host.style.position = "fixed";
    host.style.top = "0px";
    host.style.right = "0px";
    host.style.bottom = "0px";
    host.style.left = "auto";
    host.style.width = "0px";
    host.style.height = "auto";
    return;
  }
  host.style.top = "0px";
  host.style.right = "0px";
  host.style.bottom = "0px";
  host.style.left = "0px";
  host.style.width = "auto";
  host.style.height = "auto";
  host.style.position = mode === "fullscreen" ? "absolute" : "fixed";
}

function fillFullscreenPlayer(reserveChat = false) {
  if (!document.fullscreenElement) return;
  const width = reserveChat ? leftoverWidth() : Math.max(160, window.innerWidth);
  const height = Math.max(160, window.innerHeight);
  youtubePlayer()?.setSize?.(width, height);
  ignoreWindowResize = true;
  window.dispatchEvent(new Event("resize"));
  ignoreWindowResize = false;
}

function leftoverWidth() {
  return Math.max(160, window.innerWidth - OVERLAY_RESERVE);
}

function windowIsUsable() {
  return !document.hidden && window.innerWidth >= 480 && window.innerHeight >= 240;
}

function windowedPlayerSize() {
  const cap = leftoverWidth();
  const box =
    document.querySelector<HTMLElement>("#ytd-player") ||
    document.querySelector<HTMLElement>("#player-container") ||
    document.querySelector<HTMLElement>("[data-uia='player']") ||
    youtubePlayer();
  const width = Math.max(160, Math.round(box?.clientWidth || cap));
  const measured = Math.round(box?.clientHeight || 0);
  const height = measured >= 90 ? measured : Math.round((width * 9) / 16);
  return { width, height };
}

function sizePlayerToReserve(restore = false) {
  const gen = ++layoutGen;
  const apply = () => {
    if (gen !== layoutGen) return;
    placeHost();
    if (document.fullscreenElement || !windowIsUsable()) return;
    ignoreWindowResize = true;
    window.dispatchEvent(new Event("resize"));
    ignoreWindowResize = false;
    if (!restore) return;
    const { width, height } = windowedPlayerSize();
    youtubePlayer()?.setSize?.(width, height);
  };
  apply();
  window.clearTimeout(resizeTimer);
  window.clearTimeout(restoreTimer);
  resizeTimer = window.setTimeout(apply, 80);
  restoreTimer = window.setTimeout(apply, 280);
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
  if (host.parentElement === target) return;
  // Moving an already-visible host reloads the call iframe.
  if (target !== document.documentElement && target.contains(host)) return;
  target.appendChild(host);
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

function inSession() {
  const status = getState().status;
  return status === "in-party" || status === "connecting";
}

function isWindowDock(open: boolean) {
  return open && inSession();
}

export function pushPageOffset(_platform: "youtube" | "netflix", open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  const party = inSession();
  const docked = isWindowDock(open);
  const lounge = open && !party;
  placeHost();
  watchHostParent();

  const root = document.documentElement;
  root.classList.toggle("chillax-overlay-open", docked);
  root.classList.toggle("chillax-lounge", lounge);
  root.classList.toggle("chillax-fs", fullscreen);
  root.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);
  root.style.marginRight = docked && !fullscreen ? `${OVERLAY_RESERVE}px` : "";

  const host = document.getElementById(HOST_ID);
  host?.classList.toggle("is-fullscreen", fullscreen);
  host?.classList.toggle("is-open", docked);
  host?.classList.toggle("is-lounge", lounge);
  host?.classList.toggle("is-party", party);
  if (host) {
    layoutHost(
      host,
      lounge ? "lounge" : fullscreen && party ? "fullscreen" : party ? "party" : "hidden",
    );
  }

  const existing = document.getElementById(STYLE_ID);
  if (lounge) {
    existing?.remove();
    setInjectedStyle(LOUNGE_STYLE_ID, loungeCss());
    collapseYouTubeGuide();
    placeHost();
    return;
  }
  setInjectedStyle(LOUNGE_STYLE_ID, null);
  if (!docked) {
    existing?.remove();
    if (fullscreen) {
      fillFullscreenPlayer(false);
      window.setTimeout(() => fillFullscreenPlayer(false), 80);
      window.setTimeout(() => fillFullscreenPlayer(false), 280);
    } else {
      sizePlayerToReserve(true);
    }
    return;
  }
  scheduleExitTheater();
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss();
  if (!existing) (document.head || root).appendChild(style);
  if (fullscreen) {
    fillFullscreenPlayer(true);
    window.setTimeout(() => fillFullscreenPlayer(true), 80);
    window.setTimeout(() => fillFullscreenPlayer(true), 280);
  } else {
    sizePlayerToReserve(false);
  }
}

export function watchFullscreen(platform: "youtube" | "netflix", isOpen: () => boolean) {
  const sync = () => {
    if (!document.fullscreenElement && !windowIsUsable()) return;
    pushPageOffset(platform, isOpen());
  };
  document.addEventListener("fullscreenchange", sync, true);
  document.addEventListener("webkitfullscreenchange", sync, true);
  document.addEventListener("yt-fullscreen-change", sync, true);
  document.addEventListener("yt-navigate-finish", sync);
  window.addEventListener("resize", () => {
    if (ignoreWindowResize) return;
    window.clearTimeout(windowSyncTimer);
    windowSyncTimer = window.setTimeout(sync, 160);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    window.clearTimeout(windowSyncTimer);
    windowSyncTimer = window.setTimeout(sync, 200);
  });
}
