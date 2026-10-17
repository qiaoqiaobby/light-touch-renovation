import { createRoot } from "react-dom/client";
import { useDecor } from "../decor/store";
import { usePlan } from "../floorplan/store";
import { App } from "./App";
import { readHash, writeHash } from "./hash";
import { loadAnswers, persistAnswers } from "./storage";
import { usePresent } from "./store";
import "./tokens.css";
import "./styles.css";

declare global {
  interface Window {
    /** 截图检查用：读状态、数画布。不改数据。 */
    __present?: {
      state: () => ReturnType<typeof usePresent.getState>;
      canvases: () => number;
      plan: () => { others: boolean; furniture: boolean; scheme: string; scene: string; mode: string };
      decor: () => { scheme: string; stage: string; view: string; light: string; scene: string };
    };
  }
}

document.getElementById("nojs")?.remove();
const chapter = readHash();
loadAnswers();
persistAnswers();
writeHash();
window.__present = {
  state: () => usePresent.getState(),
  canvases: () => document.querySelectorAll("canvas").length,
  plan: () => {
    const p = usePlan.getState();
    return { others: p.others, furniture: p.furniture, scheme: p.scheme, scene: p.scene, mode: p.mode };
  },
  decor: () => {
    const d = useDecor.getState();
    return { scheme: d.scheme, stage: d.stage, view: d.view, light: d.light, scene: d.scene };
  },
};

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(<App />);

const goTo = (c: string | undefined) => {
  if (c && c !== "cover") requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(c)?.scrollIntoView({ block: "start" })));
};
goTo(chapter);
// 同一页面里改哈希（手动改地址、点带哈希的链接）不会重新加载，要自己读一遍。replaceState 不触发这个事件。
window.addEventListener("hashchange", () => goTo(readHash()));
