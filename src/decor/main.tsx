import { createRoot } from "react-dom/client";
import { App } from "./App";
import { measureFrame, runtime } from "./runtime";
import { Stage } from "./Stage";
import { clampStage, useDecor, type DecorView } from "./store";
import type { DecorItem, Light, SchemeId, Stage as StageId } from "./types";
import type { Scene } from "../floorplan/living-schemes";
import "../styles.css";

type DecorPatch = Parameters<ReturnType<typeof useDecor.getState>["apply"]>[0];

/* ---------- 地址哈希：独立装修页才同步，交付页有自己的哈希 ---------- */

const SCHEMES: SchemeId[] = ["S1", "S2", "S3", "S4"];
const STAGES: StageId[] = ["L0", "L1", "L2", "L3"];
const VIEWS: DecorView[] = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath", "orbit", "walk"];
const LIGHTS: Light[] = ["day", "night"];
const SCENES: Scene[] = ["daily", "movie", "dine2", "party", "exercise"];

function readHash(): DecorPatch {
  const q = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const patch: DecorPatch = {};
  const scheme = q.get("s");
  const stage = q.get("st");
  const view = q.get("v");
  const light = q.get("l");
  const scene = q.get("sc");
  if (SCHEMES.includes(scheme as SchemeId)) patch.scheme = scheme as SchemeId;
  if (STAGES.includes(stage as StageId)) patch.stage = stage as StageId;
  if (VIEWS.includes(view as DecorView)) patch.view = view as DecorView;
  if (LIGHTS.includes(light as Light)) patch.light = light as Light;
  if (SCENES.includes(scene as Scene)) patch.scene = scene as Scene;
  return patch;
}

const boot = readHash();
const bootScheme = boot.scheme ?? "S1";
useDecor.setState({ ...boot, scheme: bootScheme, stage: clampStage(bootScheme, boot.stage ?? "L3") });
useDecor.subscribe((state, prev) => {
  if (state.scheme === prev.scheme && state.stage === prev.stage && state.view === prev.view && state.light === prev.light && state.scene === prev.scene) return;
  const next = `#${new URLSearchParams({ s: state.scheme, st: state.stage, v: state.view, l: state.light, sc: state.scene })}`;
  if (window.location.hash !== next) history.replaceState(null, "", next);
});

declare global {
  interface Window {
    __decor?: {
      set: (patch: DecorPatch) => Promise<void>;
      stats: () => { frameMs: number; ao: boolean; lights: number; triangles: number; drawCalls: number; items: number };
      items: () => DecorItem[];
    };
  }
}

window.__decor = {
  async set(patch) {
    useDecor.getState().apply(patch);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await measureFrame();
  },
  stats: () => ({
    frameMs: runtime.frameMs,
    ao: runtime.ao,
    lights: runtime.lights,
    triangles: runtime.triangles,
    drawCalls: runtime.drawCalls,
    items: runtime.items.length,
  }),
  items: () => runtime.items,
};

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <div className="relative h-dvh overflow-hidden bg-paper text-ink">
    <div className="absolute inset-0 touch-none">
      <Stage />
    </div>
    <App />
  </div>,
);
