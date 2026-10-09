import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import { applyDocumentTheme, watchTheme } from "../shared/theme";
import "../shared/fonts.css";
import "./popup.css";

watchTheme((_, dark) => applyDocumentTheme(dark));
createRoot(document.getElementById("root")!).render(<Popup />);
