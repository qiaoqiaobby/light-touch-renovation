export type SchemeId = "S1" | "S2" | "S3" | "S4";
export type Stage = "L0" | "L1" | "L2" | "L3";
export type Light = "day" | "night";
export type ViewId = "L-entry" | "L-hall" | "E" | "A" | "B" | "C" | "K" | "Bath";
export type RoomId = "L" | "E" | "A" | "B" | "C" | "K" | "Bath";
export type Facing = "n" | "e" | "s" | "w" | null;
export type Mount = "floor" | "wall" | "ceiling" | "on";
export type Tag = "纹样" | "黄铜" | "黑钢" | "皮革" | "藤编" | "羊毛";
export type SrcKind = "fixed" | "layout" | "board" | "extra" | "soft";
export type TexKind =
  | "wood"
  | "planks"
  | "plaster"
  | "tatami"
  | "linen"
  | "wool"
  | "tile"
  | "ceramic"
  | "cane"
  | "persian"
  | "stripe"
  | "floral"
  | "brushed";

export type MatSpec = {
  hex: string;
  rough: number;
  metal?: number;
  sheen?: number;
  tex?: { kind: TexKind; tile: number; accent: string };
  emissive?: string;
  opacity?: number;
  neutralExempt?: boolean;
};

export type LightSpec = {
  kind: "ceiling" | "floor" | "table" | "pendant" | "sconce";
  color: string;
  intensity: number;
  at: [number, number, number];
  shadow: boolean;
};

export type DecorItem = {
  key: string;
  room: RoomId;
  src: { kind: SrcKind; id: string };
  level: Stage;
  name: string;
  model: string;
  variant?: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z: number;
  mount: Mount;
  facing: Facing;
  mats: Record<string, MatSpec>;
  light?: LightSpec;
  tags: Tag[];
  replaces?: string[];
  host?: string;
};

export type SurfaceSpec = {
  id: string;
  room: RoomId;
  edge?: number;
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  mat: MatSpec;
  changed: boolean;
};

export const STAGE_RANK: Record<Stage, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };

export function stageGte(have: Stage, need: Stage) {
  return STAGE_RANK[have] >= STAGE_RANK[need];
}
