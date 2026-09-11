import { createRoot } from "react-dom/client";
import { OverlayApp } from "../overlay/App";
import overlayCss from "../overlay/overlay.css?inline";
import { OVERLAY_RESERVE } from "../shared/constants";
import type { SessionController } from "./session";

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
  createRoot(mount).render(<OverlayApp session={session} />);
}
