import type { SessionController } from "./session";
import type { Platform } from "../shared/types";
import { getState, subscribe } from "../shared/store";

const BTN_ID = "chillax-site-launch";
const CHIP_ID = "chillax-card-chip";
const YT_BTN_ID = "chillax-yt-launch";
const STYLE_ID = "chillax-site-launch-style";
const GRADIENT = "linear-gradient(110deg, #1c525d 0%, #db704c 100%)";

const PLAY_HINT =
  /\b(play|resume|continue|watch(\s+now)?|reproducir|lecture|lesen|riproduci|assistir|再生|재생|재생하기)\b/i;
const PLAY_EXCLUDE = /\b(trailer|clip|preview|playlist|promo|sample|teaser)\b/i;

const NETFLIX_CARD_SELECTORS = [
  ".previewModal--wrapper",
  ".previewModal--container",
  ".title-card-container",
  ".slider-item",
  ".title-card",
  '[data-uia="title-card"]',
].join(",");

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
  background: ${GRADIENT} !important;
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
#${BTN_ID}:focus-visible,
#${CHIP_ID}:hover,
#${CHIP_ID}:focus-visible {
  filter: brightness(1.08) !important;
}
#${BTN_ID}:focus-visible,
#${CHIP_ID}:focus-visible {
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
#${BTN_ID}[hidden],
#${CHIP_ID}[hidden] {
  display: none !important;
}
#${CHIP_ID} {
  position: fixed !important;
  z-index: 2147483645 !important;
  display: grid !important;
  place-items: center !important;
  width: 34px !important;
  height: 34px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 2px solid rgb(251 250 244 / 0.9) !important;
  border-radius: 50% !important;
  background: ${GRADIENT} !important;
  color: #fbfaf4 !important;
  font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: -0.04em !important;
  line-height: 1 !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.45) !important;
}
#${YT_BTN_ID} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: top !important;
  width: 48px !important;
  height: 100% !important;
  padding: 0 !important;
  opacity: 1 !important;
}
#${YT_BTN_ID} .chillax-yt-mark {
  display: grid !important;
  place-items: center !important;
  width: 26px !important;
  height: 26px !important;
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

function isOurs(el: Element) {
  return Boolean(el.closest(`#${BTN_ID}, #${CHIP_ID}, #${YT_BTN_ID}`));
}

function isPlayControl(el: HTMLElement): boolean {
  if (isOurs(el)) return false;
  const label = labelOf(el);
  if (!PLAY_HINT.test(label) || PLAY_EXCLUDE.test(label)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 28) return false;
  if (rect.bottom < 48 || rect.top > window.innerHeight * 0.92) return false;
  return true;
}

/** Largest visible Play/Resume control on a landing or detail page. */
export function findPlayControl(): HTMLElement | null {
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

function stop(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function ensurePill(session: SessionController): HTMLButtonElement {
  let btn = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (btn) return btn;
  btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.className = "chillax-site-launch";
  btn.title = "Play and start a Chillax watch party";
  btn.innerHTML =
    '<span class="chillax-site-launch-mark" aria-hidden="true">Cx</span><span>Start Chillax</span>';
  btn.addEventListener("click", (event) => {
    stop(event);
    const play = btn!.previousElementSibling;
    session.launchParty({
      click: play instanceof HTMLElement && isPlayControl(play) ? play : null,
    });
  });
  return btn;
}

function placePill(session: SessionController): boolean {
  const play = findPlayControl();
  if (!play?.parentElement) {
    document.getElementById(BTN_ID)?.remove();
    return false;
  }
  const btn = ensurePill(session);
  btn.hidden = busy();
  if (btn.parentElement !== play.parentElement || btn.previousElementSibling !== play) {
    play.insertAdjacentElement("afterend", btn);
  }
  matchSiblingMetrics(btn, play);
  return true;
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
    stop(event);
    session.launchParty();
  });
  return btn;
}

function placeYoutubeButton(session: SessionController) {
  const bar =
    document.querySelector<HTMLElement>("#movie_player .ytp-right-controls-left") ||
    document.querySelector<HTMLElement>("#movie_player .ytp-right-controls");
  if (!bar) return;
  const btn = ensureYoutubeButton(session);
  const label = busy() ? "Open Chillax" : "Start Chillax party";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  if (btn.parentElement !== bar || bar.firstElementChild !== btn) bar.prepend(btn);
}

function netflixTitleId(card: Element): string | null {
  for (const link of card.querySelectorAll<HTMLAnchorElement>('a[href*="/watch/"], a[href*="/title/"]')) {
    const id = link.getAttribute("href")?.match(/\/(?:watch|title)\/(\d+)/)?.[1];
    if (id) return id;
  }
  const tracked = [card, ...card.querySelectorAll("[data-ui-tracking-context]")];
  for (const el of tracked) {
    const raw = el.getAttribute("data-ui-tracking-context");
    if (!raw) continue;
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      // Keep the raw attribute.
    }
    const id = text.match(/"video_id"\s*:\s*(\d+)/)?.[1];
    if (id) return id;
  }
  return null;
}

/** Teleparty-style round Cx chip on whichever Netflix title the pointer is over. */
function mountNetflixCardChip(session: SessionController) {
  let card: HTMLElement | null = null;
  let hideTimer = 0;
  let frame = 0;

  const chip = document.createElement("button");
  chip.id = CHIP_ID;
  chip.type = "button";
  chip.hidden = true;
  chip.textContent = "Cx";
  chip.title = "Play and start a Chillax watch party";
  chip.setAttribute("aria-label", chip.title);
  document.documentElement.appendChild(chip);

  const position = () => {
    frame = 0;
    if (!card || chip.hidden) return;
    if (!card.isConnected) {
      hide();
      return;
    }
    const rect = card.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 40) {
      hide();
      return;
    }
    chip.style.top = `${Math.round(rect.top + 8)}px`;
    chip.style.left = `${Math.round(rect.right - 34 - 8)}px`;
    frame = window.requestAnimationFrame(position);
  };

  const show = (next: HTMLElement) => {
    window.clearTimeout(hideTimer);
    if (busy()) return;
    card = next;
    chip.hidden = false;
    if (!frame) position();
  };

  function hide() {
    chip.hidden = true;
    card = null;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  const onOver = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target) return;
    if (target === chip) {
      window.clearTimeout(hideTimer);
      return;
    }
    const modal = target.closest<HTMLElement>(".previewModal--wrapper, .previewModal--container");
    const next = modal || target.closest<HTMLElement>(NETFLIX_CARD_SELECTORS);
    if (next && (netflixTitleId(next) || next.querySelector('[data-uia="play-button"]'))) {
      show(next);
      return;
    }
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 250);
  };

  chip.addEventListener("click", (event) => {
    stop(event);
    const target = card;
    if (!target) return;
    const id = netflixTitleId(target);
    hide();
    if (id) {
      session.launchParty({ href: `/watch/${id}` });
      return;
    }
    session.launchParty({ click: target.querySelector<HTMLElement>('[data-uia="play-button"]') });
  });

  document.addEventListener("mouseover", onOver, true);
  const unsub = subscribe(() => {
    if (busy()) hide();
  });

  return () => {
    document.removeEventListener("mouseover", onOver, true);
    unsub();
    hide();
    window.clearTimeout(hideTimer);
    chip.remove();
  };
}

/** Inject Chillax launch controls next to the site's own Play UI (Teleparty-style). */
export function mountSiteLaunchButton(session: SessionController, platform: Platform) {
  installStyles();
  let timer = 0;
  const sync = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (platform === "youtube") placeYoutubeButton(session);
      else placePill(session);
    }, 80);
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const unsub = subscribe(sync);
  window.addEventListener("resize", sync);
  const unmountChip = platform === "netflix" ? mountNetflixCardChip(session) : () => undefined;

  return () => {
    observer.disconnect();
    unsub();
    unmountChip();
    window.removeEventListener("resize", sync);
    window.clearTimeout(timer);
    document.getElementById(BTN_ID)?.remove();
    document.getElementById(YT_BTN_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  };
}
