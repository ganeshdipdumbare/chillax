import { createRoot } from "react-dom/client";
import { OverlayApp } from "../overlay/App";
import overlayCss from "../overlay/overlay.css?inline";
import { OVERLAY_RESERVE } from "../shared/constants";
import type { SessionController } from "./session";

function shieldPageShortcuts(host: HTMLElement, shadow: ShadowRoot) {
  const typingInOverlay = () => {
    const active = shadow.activeElement;
    if (!(active instanceof HTMLElement)) return false;
    return active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;
  };
  const onKey = (event: KeyboardEvent) => {
    if (!typingInOverlay()) return;
    event.stopImmediatePropagation();
  };
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    window.addEventListener(type, onKey, true);
  }
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.composedPath().includes(host)) return;
      shadow.activeElement instanceof HTMLElement && shadow.activeElement.blur();
    },
    true,
  );
}

export function mountOverlay(session: SessionController) {
  const host = document.createElement("div");
  host.id = "chillax-root";
  host.style.cssText =
    "position:fixed;top:0;right:0;bottom:0;width:0;overflow:visible;pointer-events:none;z-index:2147483646;";
  host.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = overlayCss;
  const mount = document.createElement("div");
  shadow.appendChild(style);
  shadow.appendChild(mount);
  shieldPageShortcuts(host, shadow);
  createRoot(mount).render(<OverlayApp session={session} />);
}
