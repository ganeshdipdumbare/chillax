import { OVERLAY_RESERVE } from "../shared/constants";

const STYLE_ID = "chillax-page-offset";
const HOST_ID = "chillax-root";

let nudgeTimers: number[] = [];

function offsetCss(platform: "youtube" | "netflix"): string {
  const space = `${OVERLAY_RESERVE}px`;
  const remaining = `calc(100vw - ${space})`;
  if (platform === "youtube") {
    return `
html.chillax-overlay-open {
  width: ${remaining} !important;
  max-width: ${remaining} !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open body,
html.chillax-overlay-open ytd-app,
html.chillax-overlay-open #content.ytd-app,
html.chillax-overlay-open #page-manager,
html.chillax-overlay-open ytd-page-manager,
html.chillax-overlay-open ytd-watch-flexy,
html.chillax-overlay-open #columns,
html.chillax-overlay-open #primary,
html.chillax-overlay-open #player,
html.chillax-overlay-open #player-container-outer,
html.chillax-overlay-open #player-container-inner,
html.chillax-overlay-open #player-container,
html.chillax-overlay-open #ytd-player,
html.chillax-overlay-open ytd-player {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
html.chillax-overlay-open #masthead-container,
html.chillax-overlay-open ytd-masthead,
html.chillax-overlay-open #container.ytd-masthead,
html.chillax-overlay-open #header {
  width: ${remaining} !important;
  max-width: ${remaining} !important;
  left: 0 !important;
  right: auto !important;
}
html.chillax-overlay-open #full-bleed-container,
html.chillax-overlay-open #player-full-bleed-container,
html.chillax-overlay-open #player-theater-container,
html.chillax-overlay-open #player-wide-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #player-full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[full-bleed-player] #player-full-bleed-container,
html.chillax-overlay-open ytd-watch-flexy[theater] #player-theater-container,
html.chillax-overlay-open #movie_player,
html.chillax-overlay-open .html5-video-player,
html.chillax-overlay-open .html5-video-container {
  width: 100% !important;
  max-width: 100% !important;
  left: 0 !important;
  right: 0 !important;
}
html.chillax-overlay-open video.html5-main-video,
html.chillax-overlay-open video.video-stream {
  max-width: 100% !important;
}
`;
  }
  return `
html.chillax-overlay-open {
  width: ${remaining} !important;
  max-width: ${remaining} !important;
  overflow-x: hidden !important;
}
html.chillax-overlay-open body,
html.chillax-overlay-open #appMountPoint {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
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

function clearNudgeTimers() {
  for (const id of nudgeTimers) window.clearTimeout(id);
  nudgeTimers = [];
}

function nudgePlayerLayout() {
  clearNudgeTimers();
  const fire = () => {
    window.dispatchEvent(new Event("resize"));
    const player = document.querySelector("#movie_player") as
      | (HTMLElement & { setSize?: (width: number, height: number) => void })
      | null;
    const box =
      document.querySelector<HTMLElement>("#full-bleed-container") ||
      document.querySelector<HTMLElement>("#player-full-bleed-container") ||
      document.querySelector<HTMLElement>("#player-theater-container") ||
      document.querySelector<HTMLElement>("#player-container") ||
      player;
    if (player?.setSize && box) {
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (width > 160 && height > 90) player.setSize(width, height);
    }
  };
  fire();
  requestAnimationFrame(fire);
  nudgeTimers = [50, 200, 600].map((ms) => window.setTimeout(fire, ms));
}

export function pushPageOffset(platform: "youtube" | "netflix", open: boolean) {
  const fullscreen = Boolean(document.fullscreenElement);
  const shouldOpen = open && !fullscreen;
  document.documentElement.classList.toggle("chillax-overlay-open", shouldOpen);
  document.documentElement.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);

  const host = document.getElementById(HOST_ID);
  host?.classList.toggle("is-fullscreen", fullscreen);
  host?.classList.toggle("is-open", shouldOpen);
  if (host) host.style.width = shouldOpen ? `${OVERLAY_RESERVE}px` : "0px";

  const existing = document.getElementById(STYLE_ID);
  if (!shouldOpen) {
    existing?.remove();
    document.documentElement.style.marginRight = "";
    nudgePlayerLayout();
    return;
  }
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = offsetCss(platform);
  if (!existing) document.documentElement.appendChild(style);
  nudgePlayerLayout();
}

export function watchFullscreen(platform: "youtube" | "netflix", isOpen: () => boolean) {
  const sync = () => pushPageOffset(platform, isOpen());
  document.addEventListener("fullscreenchange", sync);
}
