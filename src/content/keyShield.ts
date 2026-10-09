type KeyHandler = (event: KeyboardEvent) => void;
type KeyShield = { handler: KeyHandler | null };
type ShieldWindow = Window & { __chillaxKeyShield?: KeyShield; __chillaxGestureShield?: true };
type SealedEvent = Event & { __chillaxSealed?: true };

const GESTURE_TYPES = ["touchstart", "touchmove", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup", "click"] as const;
const OVERLAY_IDS = new Set(["chillax-root", "chillax-call"]);
let lastOverlayTouchAt = 0;

/**
 * Players like Prime Video add capture listeners on `window` early, and same-target listeners
 * run in registration order, so this has to be registered at document_start to beat them.
 * State lives on `window` because each content script bundles its own copy of this module.
 */
export function installKeyShield(): KeyShield {
  const w = window as ShieldWindow;
  if (w.__chillaxKeyShield) return w.__chillaxKeyShield;
  const shield: KeyShield = { handler: null };
  w.__chillaxKeyShield = shield;
  const onKey = (event: KeyboardEvent) => shield.handler?.(event);
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    window.addEventListener(type, onKey, true);
  }
  installGestureShield(w);
  return shield;
}

function hitsChillax(event: Event) {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && OVERLAY_IDS.has(node.id)) return true;
  }
  return false;
}

function defineFn(event: Event, name: "preventDefault" | "stopPropagation" | "stopImmediatePropagation", value: () => void) {
  Object.defineProperty(event, name, { configurable: true, value });
}

/**
 * Streaming players cancel touchstart on window, which on iPad suppresses the click
 * and refuses to focus the chat field. Seal that while the event is still on window,
 * then give stopPropagation back once it reaches the overlay.
 */
function fromTouch(event: Event) {
  if (event.type.startsWith("touch")) return true;
  if (event instanceof PointerEvent && (event.pointerType === "touch" || event.pointerType === "pen")) return true;
  return Date.now() - lastOverlayTouchAt < 800;
}

function sealChillaxGesture(event: Event) {
  if (!event.isTrusted || !hitsChillax(event)) return;
  if (event.type === "touchstart") lastOverlayTouchAt = Date.now();
  // Mouse clicks on desktop stay untouched. iPad taps, and the click they synthesize, do not.
  if (!fromTouch(event)) return;
  const sealed = event as SealedEvent;
  if (sealed.__chillaxSealed) return;
  sealed.__chillaxSealed = true;
  const ignore = () => {};
  try {
    defineFn(event, "preventDefault", ignore);
    defineFn(event, "stopPropagation", ignore);
    defineFn(event, "stopImmediatePropagation", ignore);
  } catch {
    delete sealed.__chillaxSealed;
  }
}

export function releaseChillaxGestureStops(event: Event) {
  const sealed = event as SealedEvent;
  if (!sealed.__chillaxSealed) return;
  try {
    // Page listeners on window already ran. Restore the methods for the overlay itself.
    defineFn(event, "preventDefault", () => Event.prototype.preventDefault.call(event));
    defineFn(event, "stopPropagation", () => Event.prototype.stopPropagation.call(event));
    defineFn(event, "stopImmediatePropagation", () => Event.prototype.stopImmediatePropagation.call(event));
  } catch {
    // preventDefault stays sealed either way, so the tap is still delivered.
  }
}

function blocksPageScroll(event: TouchEvent) {
  const raw = event.composedPath()[0];
  const node = raw instanceof Element ? raw : raw instanceof Text ? raw.parentElement : null;
  if (!(node instanceof Element)) return true;
  let el: Element | null = node;
  while (el) {
    if (el instanceof HTMLElement) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return false;
    }
    el = el.parentElement;
  }
  return true;
}

/** Call on the overlay host (and the call box) so the page never sees the gesture. */
export function bindChillaxGestureTarget(el: HTMLElement, opts?: { lockScroll?: boolean }) {
  for (const type of GESTURE_TYPES) {
    el.addEventListener(type, releaseChillaxGestureStops, true);
    el.addEventListener(
      type,
      (event) => {
        event.stopPropagation();
      },
      false,
    );
  }
  if (!opts?.lockScroll) return;
  el.addEventListener(
    "touchmove",
    (event) => {
      if (blocksPageScroll(event)) event.preventDefault();
    },
    { capture: true, passive: false },
  );
}

/**
 * Closed shadow retargets taps to the host for listeners outside it, so replay from in here.
 * Only needed when the page already cancelled the touch and iOS will not emit a click.
 */
export function bindChillaxTapReplay(el: HTMLElement) {
  let startX = 0;
  let startY = 0;
  let moved = false;
  let touchCancelled = false;
  let replayed = false;
  let replayTimer = 0;
  el.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      moved = false;
      // Click suppression is decided on touchstart, not on the later touchend.
      touchCancelled = event.defaultPrevented;
    },
    true,
  );
  el.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 12) moved = true;
    },
    true,
  );
  el.addEventListener(
    "touchend",
    (event) => {
      if (moved || !touchCancelled) return;
      const raw = event.composedPath()[0];
      const node = raw instanceof Element ? raw : raw instanceof Text ? raw.parentElement : null;
      if (!(node instanceof Element)) return;
      const field = node.closest("input, textarea");
      if (field instanceof HTMLElement) {
        field.focus();
        return;
      }
      const control = node.closest("button, a, [role='button']");
      if (!(control instanceof HTMLElement)) return;
      if (control instanceof HTMLButtonElement && control.disabled) return;
      replayed = true;
      control.click();
      window.clearTimeout(replayTimer);
      replayTimer = window.setTimeout(() => {
        replayed = false;
      }, 500);
    },
    true,
  );
  // Touchend already activated the control. Swallow the browser's follow-up click.
  el.addEventListener(
    "click",
    (event) => {
      if (!replayed || !event.isTrusted) return;
      event.stopImmediatePropagation();
      replayed = false;
    },
    true,
  );
}

function installGestureShield(w: ShieldWindow) {
  if (w.__chillaxGestureShield) return;
  w.__chillaxGestureShield = true;
  for (const type of GESTURE_TYPES) {
    // touchstart/touchmove on window are passive by default, which would make the
    // event uncancelable before the overlay can take it.
    const opts: AddEventListenerOptions =
      type === "touchstart" || type === "touchmove" ? { capture: true, passive: false } : { capture: true };
    window.addEventListener(type, sealChillaxGesture, opts);
  }
}

installKeyShield();
