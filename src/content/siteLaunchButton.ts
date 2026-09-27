import type { SessionController } from "./session";
import type { Platform } from "../shared/types";
import { getState, subscribe } from "../shared/store";

const LAUNCH_CLASS = "chillax-launch";
const YT_BTN_ID = "chillax-yt-launch";
const STYLE_ID = "chillax-site-launch-style";
const GRADIENT = "linear-gradient(110deg, #1c525d 0%, #db704c 100%)";

/** Anchored so titles like "How to play guitar" never count as a Play control. */
const PLAY_HINT =
  /^(play|resume|continue|watch(\s+now)?|start\s+watching|reproducir|lecture|lesen|riproduci|assistir|再生|재생|재생하기)(\b|$)/i;
const MAX_LABEL = 40;
const PLAY_EXCLUDE =
  /\b(trailer|clip|preview|playlist|promo|sample|teaser|later|party|together|autoplay|speed)\b/i;

/** In-player chrome: the Play/Pause toggle there flips labels and is not a launch point. */
const PLAYER_CHROME = [
  ".watch-video",
  '[data-uia="player"]',
  "#dv-web-player",
  ".webPlayerContainer",
  ".webPlayerSDKContainer",
  '[class*="atvwebplayersdk"]',
  "#movie_player",
  ".html5-video-player",
  ".btm-media-player",
  '[data-testid="player-ui-container"]',
  ".vjs-control-bar",
  "#chillax-root",
].join(",");

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${LAUNCH_CLASS} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  flex: 0 0 auto !important;
  box-sizing: border-box !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: ${GRADIENT} !important;
  color: #fbfaf4 !important;
  font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  text-decoration: none !important;
  vertical-align: middle !important;
  position: relative !important;
  z-index: 2 !important;
}
.${LAUNCH_CLASS}:hover,
.${LAUNCH_CLASS}:focus-visible {
  filter: brightness(1.08) !important;
}
.${LAUNCH_CLASS}:focus-visible {
  outline: 2px solid #fbfaf4 !important;
  outline-offset: 2px !important;
}
.${LAUNCH_CLASS}[hidden] {
  display: none !important;
}
.${LAUNCH_CLASS}--round {
  padding: 0 !important;
  letter-spacing: -0.04em !important;
}
.${LAUNCH_CLASS}--pill .chillax-launch-mark {
  display: grid !important;
  place-items: center !important;
  width: 1.45em !important;
  height: 1.45em !important;
  border-radius: 50% !important;
  background: rgb(251 250 244 / 0.92) !important;
  color: #0e1113 !important;
  font-size: 0.68em !important;
  letter-spacing: -0.04em !important;
}
#${YT_BTN_ID} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: top !important;
  padding: 0 !important;
  opacity: 1 !important;
}
#${YT_BTN_ID} .chillax-yt-mark {
  display: grid !important;
  place-items: center !important;
  width: 58% !important;
  aspect-ratio: 1 !important;
  max-width: 28px !important;
  border-radius: 50% !important;
  background: ${GRADIENT} !important;
  color: #fbfaf4 !important;
  font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: -0.04em !important;
  line-height: 1 !important;
  box-shadow: 0 0 0 1.5px rgb(251 250 244 / 0.85) !important;
}
#${YT_BTN_ID}:hover .chillax-yt-mark {
  filter: brightness(1.1) !important;
}
`;
  (document.head || document.documentElement).appendChild(style);
}

function busy() {
  const status = getState().status;
  return status === "in-party" || status === "connecting";
}

function labelOf(el: HTMLElement): string {
  const attr =
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.getAttribute("data-uia") ||
    el.getAttribute("data-automation-id") ||
    el.getAttribute("data-testid");
  if (attr) return attr.trim();
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  // Whole cards expose long text blobs; only short labels are real buttons.
  return text.length <= 32 ? text : "";
}

function isPlayControl(el: HTMLElement): boolean {
  if (el.classList.contains(LAUNCH_CLASS) || el.id === YT_BTN_ID) return false;
  const label = labelOf(el);
  if (!label || label.length > MAX_LABEL) return false;
  if (!PLAY_HINT.test(label) || PLAY_EXCLUDE.test(label)) return false;
  if (el.closest(PLAYER_CHROME)) return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= 20 && rect.height >= 20;
}

/** Every launch-worthy Play control, outermost only (e.g. <a><button>Play</button></a>). */
function findPlayControls(): HTMLElement[] {
  const hits = [
    ...document.querySelectorAll<HTMLElement>('button, a, [role="button"]'),
  ].filter(isPlayControl);
  const set = new Set(hits);
  return hits.filter((el) => {
    for (let up = el.parentElement, depth = 0; up && depth < 4; up = up.parentElement, depth += 1) {
      if (set.has(up)) return false;
    }
    return true;
  });
}

/** Largest on-screen Play control, used when a launch has no specific button. */
export function findPlayControl(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const el of findPlayControls()) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    const area = rect.width * rect.height;
    if (area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}

function isRound(rect: DOMRect) {
  return rect.width <= 72 && Math.abs(rect.width - rect.height) <= 6;
}

function mirrorPlay(btn: HTMLElement, play: HTMLElement) {
  const rect = play.getBoundingClientRect();
  const cs = getComputedStyle(play);
  const round = isRound(rect);
  const shape = round ? "round" : "pill";
  if (btn.dataset.shape !== shape) {
    btn.dataset.shape = shape;
    btn.classList.toggle(`${LAUNCH_CLASS}--round`, round);
    btn.classList.toggle(`${LAUNCH_CLASS}--pill`, !round);
    btn.innerHTML = round
      ? "Cx"
      : '<span class="chillax-launch-mark" aria-hidden="true">Cx</span><span>Start Chillax</span>';
  }
  const h = `${Math.round(rect.height)}px`;
  btn.style.setProperty("height", h, "important");
  btn.style.setProperty("min-height", h, "important");
  btn.style.setProperty("margin", `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`, "important");
  const radius = cs.borderRadius && cs.borderRadius !== "0px" ? cs.borderRadius : round ? "50%" : "4px";
  btn.style.setProperty("border-radius", radius, "important");
  if (round) {
    const w = `${Math.round(rect.width)}px`;
    btn.style.setProperty("width", w, "important");
    btn.style.setProperty("min-width", w, "important");
    btn.style.setProperty("font-size", `${Math.max(10, Math.round(rect.height * 0.34))}px`, "important");
    return;
  }
  btn.style.setProperty("min-width", `${Math.round(rect.width)}px`, "important");
  btn.style.removeProperty("width");
  const fontSize = Number.parseFloat(cs.fontSize);
  btn.style.setProperty("font-size", `${Number.isFinite(fontSize) && fontSize >= 11 ? fontSize : 15}px`, "important");
  const padX = Number.parseFloat(cs.paddingLeft);
  btn.style.setProperty("padding", `0 ${Math.max(14, Number.isFinite(padX) ? padX : 0)}px`, "important");
}

function createLaunch(session: SessionController): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = LAUNCH_CLASS;
  btn.title = "Play and start a Chillax watch party";
  btn.setAttribute("aria-label", btn.title);
  const swallow = (event: Event) => event.stopPropagation();
  btn.addEventListener("pointerdown", swallow);
  btn.addEventListener("mousedown", swallow);
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const play = btn.previousElementSibling;
    session.launchParty({ click: play instanceof HTMLElement ? play : null });
  });
  return btn;
}

function placeLaunchButtons(session: SessionController) {
  const hidden = busy();
  const plays = new Set(findPlayControls());
  for (const btn of document.querySelectorAll<HTMLElement>(`.${LAUNCH_CLASS}`)) {
    const prev = btn.previousElementSibling;
    if (!(prev instanceof HTMLElement) || !plays.has(prev)) btn.remove();
  }
  for (const play of plays) {
    let btn = play.nextElementSibling as HTMLElement | null;
    if (!btn?.classList.contains(LAUNCH_CLASS)) {
      btn = createLaunch(session);
      play.insertAdjacentElement("afterend", btn);
    }
    btn.hidden = hidden;
    if (!hidden) mirrorPlay(btn, play);
  }
}

function ensureYoutubeButton(session: SessionController): HTMLButtonElement {
  let btn = document.getElementById(YT_BTN_ID) as HTMLButtonElement | null;
  if (btn) return btn;
  btn = document.createElement("button");
  btn.id = YT_BTN_ID;
  btn.type = "button";
  btn.className = "ytp-button";
  btn.innerHTML = '<span class="chillax-yt-mark" aria-hidden="true">Cx</span>';
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    session.launchParty();
  });
  return btn;
}

/** YouTube's own Play lives in the player bar; sit right beside it at the same size. */
function placeYoutubeButton(session: SessionController) {
  const play = document.querySelector<HTMLElement>("#movie_player .ytp-play-button");
  if (!play) return;
  const btn = ensureYoutubeButton(session);
  const label = busy() ? "Open Chillax" : "Start Chillax party";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  if (play.nextElementSibling !== btn) play.insertAdjacentElement("afterend", btn);
  const rect = play.getBoundingClientRect();
  if (rect.width > 0) btn.style.setProperty("width", `${Math.round(rect.width)}px`, "important");
  if (rect.height > 0) btn.style.setProperty("height", `${Math.round(rect.height)}px`, "important");
}

/** Put a Chillax launch control right after every site Play button (Teleparty-style). */
export function mountSiteLaunchButton(session: SessionController, platform: Platform) {
  installStyles();
  let timer = 0;
  const run = () => {
    timer = 0;
    if (platform === "youtube") placeYoutubeButton(session);
    placeLaunchButtons(session);
  };
  // Throttle rather than debounce: streaming sites mutate the DOM nonstop.
  const sync = () => {
    if (!timer) timer = window.setTimeout(run, 150);
  };

  run();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const unsub = subscribe(sync);
  window.addEventListener("resize", sync);

  return () => {
    observer.disconnect();
    unsub();
    window.removeEventListener("resize", sync);
    window.clearTimeout(timer);
    document.querySelectorAll(`.${LAUNCH_CLASS}`).forEach((el) => el.remove());
    document.getElementById(YT_BTN_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  };
}
