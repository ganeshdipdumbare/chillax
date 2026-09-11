import { OVERLAY_RESERVE } from "../shared/constants";

const STYLE_ID = "chillax-page-offset";

function offsetCss(platform: "youtube" | "netflix"): string {
  const space = `${OVERLAY_RESERVE}px`;
  if (platform === "youtube") {
    return `
ytd-app {
  margin-right: ${space} !important;
}
#masthead-container,
ytd-masthead,
#container.ytd-masthead {
  width: calc(100% - ${space}) !important;
  max-width: calc(100% - ${space}) !important;
}
#player-full-bleed-container,
#full-bleed-container,
#player-theater-container,
ytd-watch-flexy[full-bleed-player] #full-bleed-container.ytd-watch-flexy,
ytd-watch-flexy[theater] #player-theater-container {
  max-width: calc(100vw - ${space}) !important;
}
`;
  }
  return `
html { width: calc(100% - ${space}) !important; }
body { overflow-x: hidden !important; }
#appMountPoint {
  width: 100% !important;
}
.watch-video,
.watch-video--player-view,
.watch-video--player-view-container,
[data-uia="player"],
[data-uia="watch-video"],
.nfp,
.nfp.AkiraPlayer {
  max-width: calc(100vw - ${space}) !important;
}
`;
}

export function pushPageOffset(platform: "youtube" | "netflix", open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  const shouldOpen = open && !fullscreen;
  document.documentElement.classList.toggle("chillax-overlay-open", shouldOpen);
  document.getElementById("chillax-root")?.classList.toggle("is-fullscreen", fullscreen);

  const existing = document.getElementById(STYLE_ID);
  if (!shouldOpen) {
    existing?.remove();
    document.documentElement.style.marginRight = "";
    return;
  }
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss(platform);
  if (!existing) document.documentElement.appendChild(style);
}

export function watchFullscreen(platform: "youtube" | "netflix", isOpen: () => boolean) {
  const sync = () => pushPageOffset(platform, isOpen());
  document.addEventListener("fullscreenchange", sync);
}
