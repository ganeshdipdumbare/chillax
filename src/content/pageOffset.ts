import { OVERLAY_RESERVE } from "../shared/constants";
import { getState } from "../shared/store";
import type { Platform } from "../shared/types";

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
let primeGuard: MutationObserver | null = null;
let primeRetryTimer = 0;
let primeApplying = false;

const PRIME_DOCK_ATTR = "data-chillax-prime-dock";
const PRIME_SHELL_SELECTORS = [
  "#dv-web-player",
  ".webPlayerContainer",
  ".webPlayerUIContainer",
  ".atvwebplayersdk-player-container",
  ".atvwebplayersdk-player-root",
];
const PRIME_INNER_SELECTORS = [
  ".scalingVideoContainer",
  ".scalingVideoContainerBottom",
  ".rendererContainer",
  ".cascadingWindowsParent",
  ".media-element-container",
];

function offsetCss(): string {
  const space = `${OVERLAY_RESERVE}px`;
  const leftover = `calc(100vw - ${space})`;

  /** Netflix Akira: explicit leftover width — right/width:auto blanks the picture. */
  const netflix = `
html.chillax-overlay-open .watch-video,
html.chillax-overlay-open .watch-video--player-view,
html.chillax-overlay-open [data-uia="player"],
html.chillax-overlay-open .nfp,
html.chillax-overlay-open .nfp.AkiraPlayer`;

  /**
   * Prime Video outer shells are fixed/full-viewport; margin on html does nothing.
   * Shrink them to the leftover column so chat docks beside the player.
   */
  const primeShell = `
html.chillax-overlay-open #dv-web-player,
html.chillax-overlay-open #dv-web-player.dv-player-fullscreen,
html.chillax-overlay-open .webPlayerContainer,
html.chillax-overlay-open .webPlayerUIContainer,
html.chillax-overlay-open .atvwebplayersdk-player-container,
html.chillax-overlay-open .atvwebplayersdk-player-root`;

  const primeInner = `
html.chillax-overlay-open .scalingVideoContainer,
html.chillax-overlay-open .scalingVideoContainerBottom,
html.chillax-overlay-open .rendererContainer,
html.chillax-overlay-open .cascadingWindowsParent,
html.chillax-overlay-open [class*="atvwebplayersdk-player"],
html.chillax-overlay-open .media-element-container`;

  /** Other full-bleed / fixed players: pin the right edge so chat does not cover video. */
  const bleed = `
html.chillax-overlay-open #hive-player,
html.chillax-overlay-open #hivePlayer,
html.chillax-overlay-open .btm-media-client-element,
html.chillax-overlay-open .btm-media-overlays-container,
html.chillax-overlay-open .btm-media-player,
html.chillax-overlay-open .content-video-player,
html.chillax-overlay-open .PlayerCenterWrapper,
html.chillax-overlay-open .HuluPlayer,
html.chillax-overlay-open .hulu-player,
html.chillax-overlay-open [data-testid="player"],
html.chillax-overlay-open [data-testid="player-ui-container"],
html.chillax-overlay-open [data-testid="video-player"],
html.chillax-overlay-open [data-testid="video_player"],
html.chillax-overlay-open [data-testid="playback"],
html.chillax-overlay-open [data-testid="PlaybackContainer"],
html.chillax-overlay-open .default-media-player,
html.chillax-overlay-open .video-player-wrapper,
html.chillax-overlay-open .video-player,
html.chillax-overlay-open .video-player-container,
html.chillax-overlay-open .video-player__container,
html.chillax-overlay-open .player-view-content,
html.chillax-overlay-open .layout-player,
html.chillax-overlay-open .videoContainer,
html.chillax-overlay-open .persistentPlayer,
html.chillax-overlay-open .persistent-player,
html.chillax-overlay-open .video-ref,
html.chillax-overlay-open [data-a-target="player-overlay-click-handler"],
html.chillax-overlay-open [data-a-player-state],
html.chillax-overlay-open .player-root,
html.chillax-overlay-open .vpc-player,
html.chillax-overlay-open.chillax-fs #movie_player,
html.chillax-overlay-open.chillax-fs #ytd-player,
html.chillax-overlay-open.chillax-fs #player-container,
html.chillax-overlay-open.chillax-fs #player-full-bleed-container,
html.chillax-overlay-open.chillax-fs #full-bleed-container`;

  /** ororo’s player is a fixed full-window overlay; shrink it so chat sits beside the picture. */
  const ororo = `
html.chillax-overlay-open:not(.chillax-fs) #overlay.fullwindow`;

  /** ororo fullscreens the video.js box itself, which the UA pins to the screen, so pull its layers in. */
  const ororoFs = `html.chillax-overlay-open.chillax-fs #ororo-video.vjs-fullscreen`;

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
html.chillax-overlay-open:not(.chillax-fs) ytd-player {
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
  width: ${leftover} !important;
  max-width: ${leftover} !important;
  left: 0 !important;
  right: auto !important;
}
${netflix} {
  left: 0 !important;
  right: auto !important;
  width: ${leftover} !important;
  max-width: ${leftover} !important;
  box-sizing: border-box !important;
}
${primeShell} {
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: auto !important;
  width: ${leftover} !important;
  max-width: ${leftover} !important;
  height: 100% !important;
  max-height: 100% !important;
  box-sizing: border-box !important;
}
${primeInner} {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  left: 0 !important;
  right: 0 !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open #dv-web-player video,
html.chillax-overlay-open .atvwebplayersdk-player-container video,
html.chillax-overlay-open .webPlayerContainer video {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
}
${bleed} {
  left: 0 !important;
  right: ${space} !important;
  width: auto !important;
  max-width: none !important;
  box-sizing: border-box !important;
}
${ororo} {
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: auto !important;
  width: ${leftover} !important;
  max-width: ${leftover} !important;
  height: 100% !important;
  max-height: 100% !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open:not(.chillax-fs) #video-wrapper,
html.chillax-overlay-open:not(.chillax-fs) #ororo-video {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  left: 0 !important;
  right: 0 !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open:not(.chillax-fs) #ororo-video video {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
}
${ororoFs} > .vjs-tech,
${ororoFs} > .vjs-poster,
${ororoFs} > .vjs-text-track-display,
${ororoFs} > .vjs-control-bar {
  left: 0 !important;
  right: auto !important;
  width: calc(100% - ${space}) !important;
  max-width: none !important;
}
${ororoFs} > .vjs-modal-dialog,
${ororoFs} > #player-flash-message {
  width: ${leftover} !important;
}
${ororoFs} > .vjs-loading-spinner,
${ororoFs} > .vjs-big-play-button {
  left: calc((100% - ${space}) / 2) !important;
}
${ororoFs} > .overlay-close,
${ororoFs} > #player-skip-buttons,
${ororoFs} > #player-info {
  translate: calc(-1 * ${space}) 0 !important;
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
  theaterTimer = window.setTimeout(() => {
    exitYouTubeTheater();
    sizePlayerToReserve();
  }, 280);
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

function clearPrimeInline(el: HTMLElement) {
  if (!el.hasAttribute(PRIME_DOCK_ATTR)) return;
  for (const prop of [
    "position",
    "inset",
    "top",
    "left",
    "right",
    "bottom",
    "width",
    "max-width",
    "height",
    "max-height",
    "box-sizing",
    "object-fit",
  ]) {
    el.style.removeProperty(prop);
  }
  el.removeAttribute(PRIME_DOCK_ATTR);
}

function collectPrimeNodes(selectors: string[]): HTMLElement[] {
  const nodes = new Set<HTMLElement>();
  for (const sel of selectors) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => nodes.add(el));
  }
  return [...nodes];
}

/**
 * Prime renames its player wrappers often; any fixed-position ancestor of the
 * playing video spans the viewport and would slide under the chat column.
 */
function primeFixedAncestors(): HTMLElement[] {
  const found = new Set<HTMLElement>();
  for (const video of document.querySelectorAll<HTMLVideoElement>("video")) {
    const rect = video.getBoundingClientRect();
    if (rect.width < 200 || rect.height < 120) continue;
    let el = video.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.id === HOST_ID) break;
      if (getComputedStyle(el).position === "fixed") found.add(el);
      el = el.parentElement;
    }
  }
  return [...found];
}

/**
 * Prime fights stylesheet overrides with continuous inline sizing against the
 * viewport. Pin shells with inline !important and re-apply when the player rebuilds.
 */
function sizePrimePlayer(docked: boolean) {
  if (primeApplying) return;
  primeApplying = true;
  try {
    if (!docked) {
      document
        .querySelectorAll<HTMLElement>(`[${PRIME_DOCK_ATTR}]`)
        .forEach((el) => clearPrimeInline(el));
      return;
    }

    const widthPx = `${leftoverWidth()}px`;
    const heightPx = `${Math.max(160, window.innerHeight)}px`;
    const stale = new Set(document.querySelectorAll<HTMLElement>(`[${PRIME_DOCK_ATTR}]`));
    const fs = document.fullscreenElement;
    const fsBox =
      fs instanceof HTMLElement && fs !== document.documentElement && fs !== document.body ? fs : null;
    // The UA forces the fullscreen element to fill the screen, so shrink what is inside it instead.
    const shrinkable = (el: HTMLElement) => !fsBox || (el !== fsBox && fsBox.contains(el));

    if (fsBox) {
      for (const child of fsBox.children) {
        if (!(child instanceof HTMLElement) || child.id === HOST_ID) continue;
        stale.delete(child);
        child.setAttribute(PRIME_DOCK_ATTR, "fs-child");
        child.style.setProperty("left", "0px", "important");
        child.style.setProperty("right", "auto", "important");
        child.style.setProperty("width", widthPx, "important");
        child.style.setProperty("max-width", widthPx, "important");
        child.style.setProperty("box-sizing", "border-box", "important");
      }
    }

    for (const el of new Set([...collectPrimeNodes(PRIME_SHELL_SELECTORS), ...primeFixedAncestors()])) {
      if (!shrinkable(el)) continue;
      stale.delete(el);
      el.setAttribute(PRIME_DOCK_ATTR, "shell");
      el.style.setProperty("position", "fixed", "important");
      el.style.setProperty("top", "0px", "important");
      el.style.setProperty("left", "0px", "important");
      el.style.setProperty("right", "auto", "important");
      el.style.setProperty("bottom", "0px", "important");
      el.style.setProperty("width", widthPx, "important");
      el.style.setProperty("max-width", widthPx, "important");
      el.style.setProperty("height", heightPx, "important");
      el.style.setProperty("max-height", heightPx, "important");
      el.style.setProperty("box-sizing", "border-box", "important");
    }

    for (const el of collectPrimeNodes(PRIME_INNER_SELECTORS)) {
      if (!shrinkable(el)) continue;
      stale.delete(el);
      el.setAttribute(PRIME_DOCK_ATTR, "inner");
      el.style.setProperty("width", "100%", "important");
      el.style.setProperty("max-width", "100%", "important");
      el.style.setProperty("height", "100%", "important");
      el.style.setProperty("max-height", "100%", "important");
      el.style.setProperty("left", "0px", "important");
      el.style.setProperty("right", "0px", "important");
      el.style.setProperty("box-sizing", "border-box", "important");
    }

    document
      .querySelectorAll<HTMLVideoElement>(
        "#dv-web-player video, .webPlayerContainer video, .atvwebplayersdk-player-container video",
      )
      .forEach((video) => {
        stale.delete(video);
        video.setAttribute(PRIME_DOCK_ATTR, "video");
        video.style.setProperty("width", "100%", "important");
        video.style.setProperty("height", "100%", "important");
        video.style.setProperty("max-width", "100%", "important");
        video.style.setProperty("max-height", "100%", "important");
        video.style.setProperty("object-fit", "contain", "important");
      });

    stale.forEach((el) => clearPrimeInline(el));
  } finally {
    primeApplying = false;
  }
}

function watchPrimeDock(active: boolean) {
  primeGuard?.disconnect();
  primeGuard = null;
  window.clearTimeout(primeRetryTimer);
  if (!active) {
    sizePrimePlayer(false);
    return;
  }

  const bump = () => {
    window.clearTimeout(primeRetryTimer);
    primeRetryTimer = window.setTimeout(() => sizePrimePlayer(true), 40);
  };

  sizePrimePlayer(true);
  primeGuard = new MutationObserver(bump);
  primeGuard.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  // Amazon rewrites shell geometry after ads / quality changes without a DOM swap.
  primeRetryTimer = window.setTimeout(() => sizePrimePlayer(true), 120);
  window.setTimeout(() => sizePrimePlayer(true), 400);
  window.setTimeout(() => sizePrimePlayer(true), 1000);
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

function sizePlayerToReserve() {
  const gen = ++layoutGen;
  const apply = () => {
    if (gen !== layoutGen) return;
    placeHost();
    if (document.fullscreenElement || !windowIsUsable()) return;
    // Keep Prime pinned before the synthetic resize so Amazon measures the docked shell.
    if (document.documentElement.classList.contains("chillax-overlay-open")) {
      sizePrimePlayer(true);
    }
    ignoreWindowResize = true;
    window.dispatchEvent(new Event("resize"));
    ignoreWindowResize = false;
    // YouTube paints from explicit setSize; resize alone can leave a blank/blurred frame.
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

export function pushPageOffset(platform: Platform, open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  const party = inSession();
  const docked = isWindowDock(open);
  const lounge = open && !party;
  const primeDock = platform === "prime" && docked;
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
    if (platform === "youtube") collapseYouTubeGuide();
    watchPrimeDock(false);
    placeHost();
    return;
  }
  setInjectedStyle(LOUNGE_STYLE_ID, null);
  if (!docked) {
    existing?.remove();
    watchPrimeDock(false);
    if (fullscreen) {
      fillFullscreenPlayer(false);
      window.setTimeout(() => fillFullscreenPlayer(false), 80);
      window.setTimeout(() => fillFullscreenPlayer(false), 280);
    } else {
      sizePlayerToReserve();
    }
    return;
  }
  if (platform === "youtube") scheduleExitTheater();
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss();
  if (!existing) (document.head || root).appendChild(style);
  watchPrimeDock(primeDock);
  if (fullscreen) {
    fillFullscreenPlayer(true);
    window.setTimeout(() => fillFullscreenPlayer(true), 80);
    window.setTimeout(() => fillFullscreenPlayer(true), 280);
  } else {
    sizePlayerToReserve();
    if (primeDock) sizePrimePlayer(true);
  }
}

export function watchFullscreen(platform: Platform, isOpen: () => boolean) {
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
