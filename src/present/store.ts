import { create } from "zustand";
import type { DecorView } from "../decor/store";
import type { Light } from "../decor/types";
import type { BoardRoomId, LayoutId, Scene, SchemeId, Stage } from "./data";
import { clampStage } from "../decor/store";

export type ChapterId = "cover" | "brief" | "site" | "pick" | "layouts" | "styles" | "compare" | "ladder" | "open" | "appendix";
export type FigId = "site" | "layout" | "style";
export type Dim = "light" | "comfort" | "flow" | "scale" | "material" | "order";
export type LayoutPref = LayoutId | "any";

/** 每张图自己的状态。引擎 store 是渲染状态，图激活时才把这里的值写进去。 */
export type SiteFig = { view: DecorView; light: Light };
export type LayoutFig = { scheme: LayoutId; scene: Scene; mode: "orbit" | "top" };
export type StyleFig = { scheme: SchemeId; stage: Stage; view: DecorView; light: Light; scene: Scene; room: BoardRoomId };

/** 客户的选择：存在本机，复制成结果文字发回设计方。 */
export type Answers = {
  picked: string[];
  revealed: boolean;
  /** 挑选前是否已经看过第 5 章（四套风格）。看过就不算盲选。 */
  sawStyles: boolean;
  points: Record<Dim, number>;
  layoutPref: LayoutPref | null;
  note: string;
};

export const NO_POINTS: Record<Dim, number> = { light: 0, comfort: 0, flow: 0, scale: 0, material: 0, order: 0 };

type State = {
  chapter: ChapterId;
  active: FigId | null;
  site: SiteFig;
  layout: LayoutFig;
  style: StyleFig;
  layoutScene: Scene;
  answers: Answers;
  setChapter: (c: ChapterId) => void;
  setActive: (f: FigId | null) => void;
  setSite: (p: Partial<SiteFig>) => void;
  setLayout: (p: Partial<LayoutFig>) => void;
  setStyle: (p: Partial<StyleFig>) => void;
  setLayoutScene: (s: Scene) => void;
  setAnswers: (p: Partial<Answers>) => void;
};

export const usePresent = create<State>((set, get) => ({
  chapter: "cover",
  active: null,
  site: { view: "orbit", light: "day" },
  layout: { scheme: "s1", scene: "daily", mode: "orbit" },
  style: { scheme: "S1", stage: "L2", view: "orbit", light: "day", scene: "daily", room: "house" },
  layoutScene: "daily",
  answers: { picked: [], revealed: false, sawStyles: false, points: { ...NO_POINTS }, layoutPref: null, note: "" },
  setChapter: (chapter) => set({ chapter }),
  setActive: (active) => set({ active }),
  setSite: (p) => set({ site: { ...get().site, ...p } }),
  setLayout: (p) => set({ layout: { ...get().layout, ...p } }),
  setStyle: (p) => {
    const next = { ...get().style, ...p };
    next.stage = clampStage(next.scheme, next.stage);
    set({ style: next });
  },
  setLayoutScene: (layoutScene) => set({ layoutScene, layout: { ...get().layout, scene: layoutScene } }),
  setAnswers: (p) => set({ answers: { ...get().answers, ...p } }),
}));
