import type { SessionController } from "./session";
import type { Platform } from "../shared/types";
import { getState, subscribe } from "../shared/store";

const LAUNCH_CLASS = "chillax-launch";
const YT_BTN_ID = "chillax-yt-launch";
const STYLE_ID = "chillax-site-launch-style";
const INK = "#0e1113";
const CREAM = "#fbfaf4";
const CORAL = "#db704c";

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
  "#ororo-video",
  "#video-wrapper",
  "#overlay.fullwindow",
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
  border-radius: 10px !important;
  background: ${INK} !important;
  color: ${CREAM} !important;
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
  box-shadow: 2px 2px 0 ${CORAL} !important;
}
.${LAUNCH_CLASS}:hover,
.${LAUNCH_CLASS}:focus-visible {
  filter: brightness(1.12) !important;
}
.${LAUNCH_CLASS}:focus-visible {
  outline: 2px solid ${CREAM} !important;
  outline-offset: 2px !important;
}
.${LAUNCH_CLASS}[hidden] {
  display: none !important;
}
.${LAUNCH_CLASS}--round {
  padding: 0 !important;
  letter-spacing: -0.04em !important;
  transform: rotate(-4deg) !important;
}
.${LAUNCH_CLASS}--pill .chillax-launch-mark {
  display: grid !important;
  place-items: center !important;
  color: ${CREAM} !important;
  font-size: 0.78em !important;
  letter-spacing: -0.04em !important;
}
#${YT_BTN_ID} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 auto !important;
  box-sizing: border-box !important;
  position: relative !important;
  padding: 0 !important;
  overflow: visible !important;
  opacity: 1 !important;
  background: transparent !important;
  border: 0 !important;
  touch-action: manipulation !important;
  -webkit-tap-highlight-color: transparent !important;
  cursor: pointer !important;
  z-index: 64 !important;
}
#${YT_BTN_ID} .chillax-yt-mark {
  display: grid !important;
  place-items: center !important;
  flex: 0 0 auto !important;
  border-radius: 32% !important;
  background: ${INK} !important;
  color: ${CREAM} !important;
  font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif !important;
  font-weight: 700 !important;
  letter-spacing: -0.04em !important;
  line-height: 1 !important;
  box-shadow: 2px 2px 0 ${CORAL} !important;
  transform: rotate(-4deg) !important;
}
#${YT_BTN_ID}:hover .chillax-yt-mark,
#${YT_BTN_ID}:focus-visible .chillax-yt-mark {
  filter: brightness(1.12) !important;
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

/** YouTube enforces Trusted Types, so innerHTML assignments throw; build nodes directly. */
function markSpan(className: string) {
  const span = document.createElement("span");
  span.className = className;
  span.setAttribute("aria-hidden", "true");
  span.textContent = "Cx";
  return span;
}

function isRound(width: number, height: number) {
  return width <= 72 && Math.abs(width - height) <= 6;
}

/** The painted button inside a wrapper link like <a><button>Play</button></a>. */
function visualOf(play: HTMLElement): HTMLElement {
  if (play.tagName === "BUTTON") return play;
  const inner = play.querySelector<HTMLElement>('button, [role="button"]');
  return inner && inner.offsetHeight > 0 ? inner : play;
}

/** Nudge the launch button so its vertical center matches the Play button's. */
function alignCenters(btn: HTMLElement, visual: HTMLElement) {
  const target = visual.getBoundingClientRect();
  const mine = btn.getBoundingClientRect();
  if (!target.height || !mine.height) return;
  // Hover previews animate with transform: scale, so convert screen px to layout px.
  const scale = visual.offsetHeight > 0 ? target.height / visual.offsetHeight : 1;
  const delta = (target.top + target.height / 2 - (mine.top + mine.height / 2)) / (scale || 1);
  if (Math.abs(delta) < 0.5) return;
  const current = Number.parseFloat(btn.style.top) || 0;
  btn.style.setProperty("top", `${Math.round((current + delta) * 10) / 10}px`, "important");
}

function mirrorPlay(btn: HTMLElement, play: HTMLElement) {
  const visual = visualOf(play);
  const width = visual.offsetWidth;
  const height = visual.offsetHeight;
  if (!width || !height) return;
  const cs = getComputedStyle(visual);
  const outer = getComputedStyle(play);
  const round = isRound(width, height);
  const shape = round ? "round" : "pill";
  if (btn.dataset.shape !== shape) {
    btn.dataset.shape = shape;
    btn.classList.toggle(`${LAUNCH_CLASS}--round`, round);
    btn.classList.toggle(`${LAUNCH_CLASS}--pill`, !round);
    if (round) btn.replaceChildren("Cx");
    else btn.replaceChildren(markSpan("chillax-launch-mark"), "Start Chillax");
  }
  const h = `${height}px`;
  btn.style.setProperty("height", h, "important");
  btn.style.setProperty("min-height", h, "important");
  btn.style.setProperty("max-height", h, "important");
  btn.style.setProperty("margin", `0 ${outer.marginRight} 0 ${outer.marginLeft}`, "important");
  btn.style.setProperty("align-self", "center", "important");
  const radius = round
    ? `${Math.max(6, Math.round(height * (12 / 38)))}px`
    : cs.borderRadius && cs.borderRadius !== "0px"
      ? cs.borderRadius
      : "10px";
  btn.style.setProperty("border-radius", radius, "important");
  if (round) {
    const w = `${width}px`;
    btn.style.setProperty("width", w, "important");
    btn.style.setProperty("min-width", w, "important");
    btn.style.setProperty("font-size", `${Math.max(10, Math.round(height * 0.34))}px`, "important");
  } else {
    btn.style.setProperty("min-width", `${width}px`, "important");
    btn.style.removeProperty("width");
    const fontSize = Number.parseFloat(cs.fontSize);
    btn.style.setProperty("font-size", `${Number.isFinite(fontSize) && fontSize >= 11 ? fontSize : 15}px`, "important");
    const padX = Number.parseFloat(cs.paddingLeft);
    btn.style.setProperty("padding", `0 ${Math.max(14, Number.isFinite(padX) ? padX : 0)}px`, "important");
  }
  alignCenters(btn, visual);
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
      const fresh = btn;
      for (const wait of [350, 900]) {
        window.setTimeout(() => {
          if (fresh.isConnected && !fresh.hidden) mirrorPlay(fresh, play);
        }, wait);
      }
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
  btn.replaceChildren(markSpan("chillax-yt-mark"));
  let lastLaunchAt = 0;
  const launch = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastLaunchAt < 500) return;
    lastLaunchAt = now;
    session.launchParty();
  };
  btn.addEventListener("click", launch);
  // iPad WebKit often skips click when the player bar swallowed touchstart.
  btn.addEventListener("touchend", launch, { passive: false });
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
  mirrorYoutubePlay(btn, play);
}

function paintsBackground(el: HTMLElement) {
  const clear = (color: string) => color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color);
  return (
    !clear(getComputedStyle(el).backgroundColor) ||
    !clear(getComputedStyle(el, "::before").backgroundColor)
  );
}

/** Same box as YouTube's Play (size, margins, float), with the ink Cx tile inside. */
function mirrorYoutubePlay(btn: HTMLElement, play: HTMLElement) {
  const width = play.offsetWidth;
  const height = play.offsetHeight;
  if (!width || !height) return;
  const cs = getComputedStyle(play);
  btn.style.setProperty("width", `${width}px`, "important");
  btn.style.setProperty("min-width", `${width}px`, "important");
  btn.style.setProperty("height", `${height}px`, "important");
  let next = btn.nextElementSibling as HTMLElement | null;
  while (next && !next.offsetWidth) next = next.nextElementSibling as HTMLElement | null;
  const gap = next ? getComputedStyle(next).marginLeft : "8px";
  btn.style.setProperty(
    "margin",
    `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${gap === "0px" ? "8px" : gap}`,
    "important",
  );
  btn.style.setProperty("float", cs.float, "important");
  btn.style.setProperty("vertical-align", cs.verticalAlign, "important");
  btn.style.setProperty("align-self", cs.alignSelf, "important");
  const side = Math.min(width, height);
  // Leave room for the coral offset so the tile matches the toolbar mark.
  const tile = Math.round((paintsBackground(play) ? side : side * 0.72) * 0.84);
  const mark = btn.firstElementChild as HTMLElement | null;
  if (mark) {
    mark.style.setProperty("width", `${tile}px`, "important");
    mark.style.setProperty("height", `${tile}px`, "important");
    mark.style.setProperty("border-radius", `${Math.max(4, Math.round(tile * (12 / 38)))}px`, "important");
    mark.style.setProperty("font-size", `${Math.max(10, Math.round(tile * 0.38))}px`, "important");
  }
  alignCenters(btn, play);
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
