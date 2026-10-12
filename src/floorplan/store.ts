import { create } from "zustand";
import { DOORS } from "./plan-data";

export type ViewMode = "orbit" | "top" | "walk";

type Stick = { x: number; y: number };

type PlanState = {
  mode: ViewMode;
  section: boolean;
  furniture: boolean;
  labels: boolean;
  night: boolean;
  hour: number;
  selected: string | null;
  doors: Record<string, number>;
  focus: { id: string; n: number } | null;
  stick: Stick;
  setMode: (mode: ViewMode) => void;
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
  labels: true,
  night: false,
  hour: 11,
  selected: null,
  doors: openDoors,
  focus: null,
  stick: { x: 0, y: 0 },
  setMode: (mode) => set({ mode }),
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
