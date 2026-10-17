import { createRoot } from "react-dom/client";
import { App } from "./App";
import { readHash, writeHash } from "./hash";
import { loadAnswers, persistAnswers } from "./storage";
import { usePresent } from "./store";
import "./tokens.css";
import "./styles.css";

declare global {
  interface Window {
    /** 截图检查用：读状态、数画布。不改数据。 */
    __present?: { state: () => ReturnType<typeof usePresent.getState>; canvases: () => number };
  }
}

document.getElementById("nojs")?.remove();
const chapter = readHash();
loadAnswers();
persistAnswers();
writeHash();
window.__present = { state: () => usePresent.getState(), canvases: () => document.querySelectorAll("canvas").length };

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(<App />);

if (chapter && chapter !== "cover") requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(chapter)?.scrollIntoView({ block: "start" })));
