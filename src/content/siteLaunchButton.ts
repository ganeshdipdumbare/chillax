import type { SessionController } from "./session";
import { getState, subscribe } from "../shared/store";

const BTN_ID = "chillax-site-launch";
const STYLE_ID = "chillax-site-launch-style";

const PLAY_HINT =
  /\b(play|resume|continue|watch(\s+now)?|reproducir|lecture|lesen|riproduci|assistir|再生|재생|재생하기)\b/i;
const PLAY_EXCLUDE = /\b(trailer|clip|preview|playlist|promo|sample|teaser)\b/i;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#${BTN_ID} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  flex: 0 0 auto !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 999px !important;
  padding: 0 18px !important;
  min-height: 44px !important;
  background: linear-gradient(110deg, #1c525d 0%, #db704c 100%) !important;
  color: #fbfaf4 !important;
  font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  letter-spacing: -0.02em !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  text-decoration: none !important;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.28) !important;
  z-index: 5 !important;
}
#${BTN_ID}:hover,
#${BTN_ID}:focus-visible {
  filter: brightness(1.06) !important;
}
#${BTN_ID}:focus-visible {
  outline: 2px solid #fbfaf4 !important;
  outline-offset: 2px !important;
}
#${BTN_ID} .chillax-site-launch-mark {
  display: grid !important;
  place-items: center !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  background: rgb(251 250 244 / 0.92) !important;
  color: #0e1113 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: -0.04em !important;
}
#${BTN_ID}[hidden] {
  display: none !important;
}
`;
  (document.head || document.documentElement).appendChild(style);
}

function labelOf(el: HTMLElement): string {
  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.getAttribute("data-uia") ||
    el.getAttribute("data-automation-id") ||
    el.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function isPlayControl(el: HTMLElement): boolean {
  if (el.id === BTN_ID || el.closest(`#${BTN_ID}`)) return false;
  const label = labelOf(el);
  if (!PLAY_HINT.test(label) || PLAY_EXCLUDE.test(label)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 28) return false;
  if (rect.bottom < 48 || rect.top > window.innerHeight * 0.92) return false;
  return true;
}

function findPlayControl(): HTMLElement | null {
  const preferred = document.querySelector<HTMLElement>(
    [
      '[data-automation-id="play"]',
      '[data-automation-id*="play-button" i]',
      '[data-uia="play-button"]',
      '[data-uia="play-button-reload"]',
      'button[aria-label*="Play" i]',
      'a[aria-label*="Play" i]',
      'button[aria-label*="Resume" i]',
      'a[aria-label*="Resume" i]',
    ].join(","),
  );
  if (preferred && isPlayControl(preferred)) return preferred;

  const nodes = document.querySelectorAll<HTMLElement>('button, a, [role="button"]');
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const node of nodes) {
    if (!isPlayControl(node)) continue;
    const rect = node.getBoundingClientRect();
    const area = rect.width * rect.height;
    // Prefer larger hero Play buttons over tiny player chrome.
    if (area > bestArea) {
      best = node;
      bestArea = area;
    }
  }
  return best;
}

function matchSiblingMetrics(btn: HTMLElement, sibling: HTMLElement) {
  const cs = getComputedStyle(sibling);
  const height = Number.parseFloat(cs.height);
  if (Number.isFinite(height) && height >= 32) {
    btn.style.minHeight = `${Math.round(height)}px`;
    btn.style.height = `${Math.round(height)}px`;
  }
  if (cs.borderRadius && cs.borderRadius !== "0px") {
    btn.style.borderRadius = cs.borderRadius;
  }
  const fontSize = Number.parseFloat(cs.fontSize);
  if (Number.isFinite(fontSize) && fontSize >= 12) {
    btn.style.fontSize = `${fontSize}px`;
  }
  const padY = Number.parseFloat(cs.paddingTop);
  const padX = Number.parseFloat(cs.paddingLeft);
  if (Number.isFinite(padY) && Number.isFinite(padX) && padX > 0) {
    btn.style.padding = `${Math.max(0, padY)}px ${Math.max(14, padX)}px`;
  }
}

function ensureButton(session: SessionController): HTMLButtonElement {
  let btn = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (btn) return btn;
  btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.className = "chillax-site-launch";
  btn.title = "Start a Chillax watch party";
  btn.innerHTML =
    '<span class="chillax-site-launch-mark" aria-hidden="true">Cx</span><span>Start Chillax</span>';
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const state = getState();
    if (state.status === "in-party" || state.status === "connecting") {
      session.toggleOverlay(true);
      return;
    }
    if (state.isWatchPage && state.contentId) {
      session.startParty();
      return;
    }
    // Detail pages without an active player: open the lounge so they can start/join.
    session.toggleOverlay(true);
  });
  return btn;
}

function placeButton(session: SessionController): boolean {
  installStyles();
  const play = findPlayControl();
  if (!play?.parentElement) return false;

  const btn = ensureButton(session);
  const state = getState();
  const busy = state.status === "in-party" || state.status === "connecting";
  btn.hidden = busy;
  btn.querySelector("span:last-child")!.textContent = busy ? "Open Chillax" : "Start Chillax";

  if (btn.parentElement !== play.parentElement || btn.previousElementSibling !== play) {
    play.insertAdjacentElement("afterend", btn);
  }
  matchSiblingMetrics(btn, play);
  return true;
}

/** Inject Start Chillax beside the site Play button (Teleparty-style). */
export function mountSiteLaunchButton(session: SessionController) {
  let timer = 0;
  const sync = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      placeButton(session);
    }, 80);
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const unsub = subscribe(sync);
  window.addEventListener("resize", sync);

  return () => {
    observer.disconnect();
    unsub();
    window.removeEventListener("resize", sync);
    window.clearTimeout(timer);
    document.getElementById(BTN_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  };
}
