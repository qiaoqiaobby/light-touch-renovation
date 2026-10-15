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

const SCHEMES: SchemeId[] = ["S1", "S2", "S3", "S4"];
const STAGES: Stage[] = ["L0", "L1", "L2", "L3"];
const VIEWS: DecorView[] = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath", "orbit", "walk"];
const LIGHTS: Light[] = ["day", "night"];
const SCENES: Scene[] = ["daily", "movie", "dine2", "party", "exercise"];

function clampStage(scheme: SchemeId, stage: Stage): Stage {
  return scheme === "S1" || scheme === "S4" ? (stage === "L3" ? "L2" : stage) : stage;
}

function readHash(): Partial<DecorState> {
  const q = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const patch: Partial<DecorState> = {};
  const scheme = q.get("s");
  const stage = q.get("st");
  const view = q.get("v");
  const light = q.get("l");
  const scene = q.get("sc");
  if (SCHEMES.includes(scheme as SchemeId)) patch.scheme = scheme as SchemeId;
  if (STAGES.includes(stage as Stage)) patch.stage = stage as Stage;
  if (VIEWS.includes(view as DecorView)) patch.view = view as DecorView;
  if (LIGHTS.includes(light as Light)) patch.light = light as Light;
  if (SCENES.includes(scene as Scene)) patch.scene = scene as Scene;
  return patch;
}

function writeHash(state: DecorState) {
  const q = new URLSearchParams({
    s: state.scheme,
    st: state.stage,
    v: state.view,
    l: state.light,
    sc: state.scene,
  });
  const next = `#${q}`;
  if (window.location.hash !== next) history.replaceState(null, "", next);
}

export const useDecor = create<DecorState>((set, get) => {
  const boot = typeof window === "undefined" ? {} : readHash();
  const scheme = boot.scheme ?? "S1";
  const stage = clampStage(scheme, boot.stage ?? "L3");
  return {
    scheme,
    stage,
    view: boot.view ?? "L-entry",
    light: boot.light ?? "day",
    scene: boot.scene ?? "daily",
    ao: true,
    frameMs: 0,
    ready: false,
    apply: (patch) => {
      const curr = get();
      const schemeNext = patch.scheme ?? curr.scheme;
      const stageNext = clampStage(schemeNext, patch.stage ?? curr.stage);
      const next = { ...curr, ...patch, scheme: schemeNext, stage: stageNext };
      set(next);
      writeHash(next);
    },
    setStats: (frameMs, ao) => set({ frameMs, ao, ready: true }),
    setReady: (ready) => set({ ready }),
  };
});

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
