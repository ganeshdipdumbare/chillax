import { createRoot } from "react-dom/client";
import { OverlayApp } from "../overlay/App";
import overlayCss from "../overlay/overlay.css?inline";
import type { SessionController } from "./session";

export function mountOverlay(session: SessionController) {
  const host = document.createElement("div");
  host.id = "chillax-root";
  host.style.cssText =
    "position:fixed;top:0;right:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483646;";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = overlayCss;
  const mount = document.createElement("div");
  shadow.appendChild(style);
  shadow.appendChild(mount);
  createRoot(mount).render(<OverlayApp session={session} />);
}
