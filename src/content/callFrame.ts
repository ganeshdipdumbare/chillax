import { bindChillaxGestureTarget } from "./keyShield";

export const CALL_FRAME_ID = "chillax-call";

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
    iframe.setAttribute("allow", "camera; microphone; autoplay");
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
    park(box);
    bindChillaxGestureTarget(box);
    const root = document.getElementById("chillax-root");
    (root?.parentElement ?? document.documentElement).appendChild(box);
  }
  const iframe = box.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) throw new Error("missing call frame");
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
    park(box);
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

function park(box: HTMLElement) {
  for (const [prop, value] of [
    ["position", "fixed"],
    ["left", "-12000px"],
    ["top", "0px"],
    ["width", "1px"],
    ["height", "1px"],
    ["margin", "0px"],
    ["padding", "0px"],
    ["border", "0px"],
    ["overflow", "hidden"],
    ["z-index", "2147483647"],
    ["pointer-events", "none"],
    ["background", "transparent"],
    ["max-width", "none"],
    ["max-height", "none"],
  ] as const) {
    important(box, prop, value);
  }
}
