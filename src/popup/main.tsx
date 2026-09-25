import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import { watchTheme } from "../shared/theme";
import "../shared/fonts.css";
import "./popup.css";

watchTheme((_, dark) => document.documentElement.classList.toggle("theme-dark", dark));
createRoot(document.getElementById("root")!).render(<Popup />);
