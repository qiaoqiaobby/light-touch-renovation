import { create } from "zustand";
import { DOORS } from "./plan-data";
import type { Scene, SchemeId } from "./living-schemes";

export type ViewMode = "orbit" | "top" | "walk";
export type SchemeMode = "show" | SchemeId;

type Stick = { x: number; y: number };

type PlanState = {
  mode: ViewMode;
  section: boolean;
  furniture: boolean;
  /** 客厅以外房间的示意家具。交付页的客厅布局图关掉它，免得和风格方案的卧室摆放打架。 */
  others: boolean;
  /** 全屋鸟瞰的相机距离（米）。交付页的图框比全屏矮，拉远一点免得裁到。 */
  houseDist: number;
  labels: boolean;
  night: boolean;
  hour: number;
  selected: string | null;
  doors: Record<string, number>;
  focus: { id: string; n: number } | null;
  stick: Stick;
  scheme: SchemeMode;
  scene: Scene;
  setMode: (mode: ViewMode) => void;
  setScheme: (scheme: SchemeMode) => void;
  setScene: (scene: Scene) => void;
  toggleSection: () => void;
  toggleFurniture: () => void;
  toggleLabels: () => void;
  toggleNight: () => void;
  setHour: (hour: number) => void;
  select: (id: string | null) => void;
  focusRoom: (id: string) => void;
  toggleDoor: (id: string) => void;
  setStick: (stick: Stick) => void;
};

const openDoors = Object.fromEntries(DOORS.map((d) => [d.id, d.id === "M1" ? 0.35 : 0.72]));

export const usePlan = create<PlanState>((set, get) => ({
  mode: "orbit",
  section: true,
  furniture: true,
  others: true,
  houseDist: 16.2,
  labels: true,
  night: false,
  hour: 11,
  selected: null,
  doors: openDoors,
  focus: null,
  stick: { x: 0, y: 0 },
  scheme: "show",
  scene: "daily",
  setMode: (mode) => set({ mode }),
  setScheme: (scheme) => set({ scheme, focus: scheme === "show" ? get().focus : { id: "L", n: (get().focus?.n ?? 0) + 1 } }),
  setScene: (scene) => set({ scene }),
  toggleSection: () => set({ section: !get().section }),
  toggleFurniture: () => set({ furniture: !get().furniture }),
  toggleLabels: () => set({ labels: !get().labels }),
  toggleNight: () => set({ night: !get().night }),
  setHour: (hour) => set({ hour }),
  select: (id) => set({ selected: id }),
  focusRoom: (id) => set((s) => ({ selected: id === "all" ? s.selected : id, focus: { id, n: (s.focus?.n ?? 0) + 1 } })),
  toggleDoor: (id) =>
    set((s) => ({
      doors: { ...s.doors, [id]: (s.doors[id] ?? 0) > 0.5 ? 0 : 1 },
    })),
  setStick: (stick) => set({ stick }),
}));
