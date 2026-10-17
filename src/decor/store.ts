import { create } from "zustand";
import { maxStage } from "./levels";
import type { Light, SchemeId, Stage, ViewId } from "./types";
import type { Scene } from "../floorplan/living-schemes";

export type DecorView = ViewId | "orbit" | "walk";

type DecorState = {
  scheme: SchemeId;
  stage: Stage;
  view: DecorView;
  light: Light;
  scene: Scene;
  ao: boolean;
  frameMs: number;
  ready: boolean;
  apply: (patch: Partial<Pick<DecorState, "scheme" | "stage" | "view" | "light" | "scene">>) => void;
  setStats: (frameMs: number, ao: boolean) => void;
  setReady: (ready: boolean) => void;
};

export function clampStage(scheme: SchemeId, stage: Stage): Stage {
  return scheme === "S1" || scheme === "S4" ? (stage === "L3" ? "L2" : stage) : stage;
}

export const useDecor = create<DecorState>((set, get) => ({
  scheme: "S1",
  stage: clampStage("S1", "L3"),
  view: "L-entry",
  light: "day",
  scene: "daily",
  ao: true,
  frameMs: 0,
  ready: false,
  apply: (patch) => {
    const curr = get();
    const schemeNext = patch.scheme ?? curr.scheme;
    const stageNext = clampStage(schemeNext, patch.stage ?? curr.stage);
    set({ ...curr, ...patch, scheme: schemeNext, stage: stageNext });
  },
  setStats: (frameMs, ao) => set({ frameMs, ao, ready: true }),
  setReady: (ready) => set({ ready }),
}));

export function stageUp(stage: Stage, scheme: SchemeId): Stage {
  const order: Stage[] = ["L0", "L1", "L2", "L3"];
  const cap = maxStage(scheme);
  const i = Math.min(order.indexOf(stage) + 1, order.indexOf(cap));
  return order[i];
}

export function stageDown(stage: Stage): Stage {
  const order: Stage[] = ["L0", "L1", "L2", "L3"];
  return order[Math.max(0, order.indexOf(stage) - 1)];
}
