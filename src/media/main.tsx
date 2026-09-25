import { createRoot } from "react-dom/client";
import { MediaApp } from "./MediaApp";
import { watchTheme } from "../shared/theme";
import "../shared/fonts.css";
import "./media.css";

watchTheme((_, dark) => document.documentElement.classList.toggle("theme-dark", dark));
createRoot(document.getElementById("root")!).render(<MediaApp />);
