import { createRoot } from "react-dom/client";
import { App } from "./App";
import { measureFrame, runtime } from "./runtime";
import { Stage } from "./Stage";
import { useDecor } from "./store";
import type { DecorItem } from "./types";
import "../styles.css";

type DecorPatch = Parameters<ReturnType<typeof useDecor.getState>["apply"]>[0];

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
