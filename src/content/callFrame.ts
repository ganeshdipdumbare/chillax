import { MSG_SOURCE_CONTENT } from "../shared/constants";
import { bindChillaxGestureTarget } from "./keyShield";

export const CALL_FRAME_ID = "chillax-call";

const LIGHT_CANVAS = "#fbfaf4";
const DARK_CANVAS = "#0e1113";
let callDark = false;

/**
 * The call UI has to stay a tiny fixed box. On iPad, WebKit hit-tests an iframe
 * across its nearest fixed full-screen ancestor, so a frame inside the overlay
 * eats every tap — chat, hide, reactions — once the party connects.
 * Page CSS can't restyle it: every property is inline !important.
 */
function important(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(prop, value, "important");
}

export function ensureCallFrame(src: string): HTMLIFrameElement {
  let box = document.getElementById(CALL_FRAME_ID);
  if (!(box instanceof HTMLDivElement)) {
    box = document.createElement("div");
    box.id = CALL_FRAME_ID;
    const iframe = document.createElement("iframe");
    iframe.title = "Chillax voice and video";
    iframe.setAttribute("allow", "camera; microphone; autoplay; encrypted-media");
    iframe.setAttribute("scrolling", "no");
    iframe.src = src;
    for (const [prop, value] of [
      ["position", "absolute"],
      ["inset", "0px"],
      ["width", "100%"],
      ["height", "100%"],
      ["max-width", "100%"],
      ["max-height", "100%"],
      ["border", "0px"],
      ["margin", "0px"],
      ["display", "block"],
      ["overflow", "hidden"],
      ["background", "transparent"],
    ] as const) {
      important(iframe, prop, value);
    }
    box.appendChild(iframe);
    iframe.addEventListener("load", () => paintCallTheme());
    warmHold(box);
    bindChillaxGestureTarget(box);
    const root = document.getElementById("chillax-root");
    (root?.parentElement ?? document.documentElement).appendChild(box);
  }
  const iframe = box.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) throw new Error("missing call frame");
  paintCallTheme();
  return iframe;
}

export function placeCallFrame(rect: DOMRect | null) {
  const box = document.getElementById(CALL_FRAME_ID);
  if (!(box instanceof HTMLElement)) return;
  const onScreen =
    rect &&
    rect.width >= 8 &&
    rect.height >= 8 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight;
  if (!onScreen || !rect) {
    warmHold(box);
    paintCallTheme();
    return;
  }
  const parent = box.parentElement;
  const nested = parent && parent !== document.documentElement && parent !== document.body;
  const origin = nested ? parent.getBoundingClientRect() : { left: 0, top: 0 };
  important(box, "position", nested ? "absolute" : "fixed");
  important(box, "left", `${Math.round(rect.left - origin.left)}px`);
  important(box, "top", `${Math.round(rect.top - origin.top)}px`);
  important(box, "width", `${Math.round(rect.width)}px`);
  important(box, "height", `${Math.round(rect.height)}px`);
  important(box, "pointer-events", "auto");
  important(box, "visibility", "visible");
  important(box, "opacity", "1");
  paintCallTheme();
}

/** The call frame is its own document, so the panel theme has to be pushed in. */
export function setCallTheme(dark: boolean) {
  callDark = dark;
  paintCallTheme();
}

function paintCallTheme() {
  const box = document.getElementById(CALL_FRAME_ID);
  if (!(box instanceof HTMLElement)) return;
  const canvas = callDark ? DARK_CANVAS : LIGHT_CANVAS;
  const scheme = callDark ? "dark" : "light";
  important(box, "background", canvas);
  important(box, "color-scheme", scheme);
  const iframe = box.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) return;
  important(iframe, "background", canvas);
  important(iframe, "color-scheme", scheme);
  iframe.contentWindow?.postMessage(
    { source: MSG_SOURCE_CONTENT, type: "theme", dark: callDark },
    "*",
  );
}

export function removeCallFrame() {
  document.getElementById(CALL_FRAME_ID)?.remove();
}

/** Keep the call frame in the same layer as the overlay, including fullscreen. */
export function parentCallFrameWith(host: HTMLElement) {
  const box = document.getElementById(CALL_FRAME_ID);
  const parent = host.parentElement;
  if (!box || !parent || box.parentElement === parent) return;
  parent.appendChild(box);
}

/** iPad WebKit throttles 1×1 off-screen iframes — peer signaling never completes. */
function warmHold(box: HTMLElement) {
  for (const [prop, value] of [
    ["position", "fixed"],
    ["left", "0px"],
    ["top", "0px"],
    ["width", "320px"],
    ["height", "240px"],
    ["margin", "0px"],
    ["padding", "0px"],
    ["border", "0px"],
    ["overflow", "hidden"],
    ["z-index", "2147483646"],
    ["pointer-events", "none"],
    ["visibility", "hidden"],
    ["opacity", "0"],
    ["background", "transparent"],
    ["max-width", "none"],
    ["max-height", "none"],
  ] as const) {
    important(box, prop, value);
  }
}

export function reloadCallFrame(src: string) {
  const box = document.getElementById(CALL_FRAME_ID);
  if (!(box instanceof HTMLElement)) return;
  const iframe = box.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) return;
  iframe.src = src;
  warmHold(box);
}
