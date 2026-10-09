import { createRoot } from "react-dom/client";
import { OverlayApp } from "../overlay/App";
import overlayCss from "../overlay/overlay.css?inline";
import fontsCss from "../shared/fonts.css?inline";
import { OVERLAY_INSET, OVERLAY_PANEL_WIDTH, OVERLAY_RESERVE } from "../shared/constants";
import { watchTheme } from "../shared/theme";
import { setCallTheme } from "./callFrame";
import { bindChillaxGestureTarget, bindChillaxTapReplay, installKeyShield } from "./keyShield";
import type { SessionController } from "./session";

// @font-face is ignored inside shadow roots, so the faces live in the page document.
function installFonts() {
  if (document.getElementById("chillax-fonts")) return;
  const style = document.createElement("style");
  style.id = "chillax-fonts";
  style.textContent = fontsCss.replaceAll("/fonts/", chrome.runtime.getURL("fonts/"));
  (document.head || document.documentElement).appendChild(style);
}

function shieldPageShortcuts(host: HTMLElement, shadow: ShadowRoot, mount: HTMLElement) {
  const onKey = (event: KeyboardEvent) => {
    const active = shadow.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (
      (event.key === "Enter" || event.key === "NumpadEnter") &&
      !event.repeat &&
      !event.isComposing &&
      active.tagName === "INPUT"
    ) {
      const form = active.closest("form");
      if (form) {
        event.preventDefault();
        event.stopImmediatePropagation();
        form.requestSubmit();
        return;
      }
    }
    event.stopImmediatePropagation();
  };
  installKeyShield().handler = onKey;
  // Players cancel the touch on window; release that seal at the host and keep the gesture here.
  bindChillaxGestureTarget(host, { lockScroll: true });
  bindChillaxTapReplay(mount);
  // Players like ororo bind document wheel to volume and cancel the scroll.
  host.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
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
  installFonts();
  document.querySelectorAll("#chillax-root").forEach((el) => el.remove());
  const host = document.createElement("div");
  host.id = "chillax-root";
  host.style.cssText =
    "position:fixed;top:0;right:0;bottom:0;width:0;overflow:visible;pointer-events:none;background:transparent;z-index:2147483646;";
  host.style.setProperty("--chillax-reserve", `${OVERLAY_RESERVE}px`);
  host.style.setProperty("--chillax-panel", `${OVERLAY_PANEL_WIDTH}px`);
  host.style.setProperty("--chillax-inset", `${OVERLAY_INSET}px`);
  document.documentElement.appendChild(host);
  watchTheme((_, dark) => {
    host.classList.toggle("theme-dark", dark);
    host.style.colorScheme = dark ? "dark" : "light";
    setCallTheme(dark);
  });
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = overlayCss;
  const mount = document.createElement("div");
  mount.style.cssText =
    "position:absolute;inset:0;overflow:visible;pointer-events:none;background:transparent;";
  shadow.appendChild(style);
  shadow.appendChild(mount);
  shieldPageShortcuts(host, shadow, mount);
  createRoot(mount).render(<OverlayApp session={session} />);
}
