import { createRoot } from "react-dom/client";
import { MediaApp } from "./MediaApp";
import { MSG_SOURCE_CONTENT } from "../shared/constants";
import { applyDocumentTheme, watchTheme } from "../shared/theme";
import "../shared/fonts.css";
import "./media.css";

watchTheme((_, dark) => applyDocumentTheme(dark));
window.addEventListener("message", (event) => {
  const data = event.data as { source?: string; type?: string; dark?: boolean } | null;
  if (data?.source !== MSG_SOURCE_CONTENT || data.type !== "theme" || typeof data.dark !== "boolean") return;
  applyDocumentTheme(data.dark);
});
createRoot(document.getElementById("root")!).render(<MediaApp />);
