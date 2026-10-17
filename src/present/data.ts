/**
 * 交付页的数据入口：只读，不复制坐标。
 * 几何与客厅布局来自户型三维，风格方案与现状硬装来自 boards，裁切与检查结论来自构建时的虚拟模块。
 */
import { CROPS, FACTS } from "virtual:present-board";
import { SCHEMES as BOARD_SCHEMES, RULES } from "../../boards/data/schemes.mjs";
import { BOARD_ROOMS as RAW_BOARD_ROOMS, FIXED as RAW_FIXED, RETAINED as RAW_RETAINED } from "../../boards/data/house.mjs";
import { planArea } from "../floorplan/geometry";
import { SCENES, SCHEMES as LAYOUTS, resolvePieces, type Piece, type Scene, type SchemeId as LayoutId } from "../floorplan/living-schemes";
import { CEILING, DOORS, ROOMS, type Door, type Room } from "../floorplan/plan-data";
import type { SchemeId, Stage } from "../decor/types";

export { CEILING, CROPS, DOORS, FACTS, LAYOUTS, ROOMS, RULES, SCENES, planArea, resolvePieces };
export type { Door, LayoutId, Piece, Room, Scene, SchemeId, Stage };

export type Level = "L0" | "L1" | "L2" | "L3" | "L4";
export type Mount = "floor" | "wall" | "ceiling" | "on";
export type BoardRoomId = "house" | "L" | "E" | "A" | "B" | "C" | "K" | "Bath";

export type BPiece = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  mount?: Mount;
  fill?: string;
  cover?: boolean;
  type?: string;
};
export type BTile = { crop: string; piece?: string; use?: string; take: string };
export type BChange = { level: Level; text: string; rev: string };
export type BScheme = {
  id: SchemeId;
  name: string;
  layout: LayoutId;
  layoutName: string;
  control: boolean;
  claim: string;
  mix: [string, number][];
  shared: string;
  contrast: string;
  cost: string;
  exclude: string[];
  palette: { main: { name: string; hex: string }[]; accent: { name: string; hex: string }[] };
  retained: Record<string, { keep: boolean; level?: Level; text?: string; note?: string }>;
  rooms: Record<string, { tiles: BTile[]; pieces?: BPiece[]; changes: BChange[] }>;
};
export type BoardRoom = { id: BoardRoomId; name: string; plan?: string; view?: [number, number, number, number]; role?: string };
export type Fixed = { id: string; room: string; kind: string; name: string; x: number; y: number; w: number; d: number; h: number; swatch?: string };
export type Retained = { id: string; name: string; swatch: string; rooms: string[]; large: boolean; note?: string };

export const SCHEMES = BOARD_SCHEMES as BScheme[];
export const BOARD_ROOMS = RAW_BOARD_ROOMS as BoardRoom[];
export const FIXED = RAW_FIXED as Fixed[];
export const RETAINED = RAW_RETAINED as Retained[];

export const schemeOf = (id: SchemeId) => SCHEMES.find((s) => s.id === id) ?? SCHEMES[0];
export const layoutOf = (id: LayoutId) => LAYOUTS.find((s) => s.id === id) ?? LAYOUTS[0];
export const roomOf = (id: string) => ROOMS.find((r) => r.id === id)!;
export const boardRoomOf = (id: BoardRoomId) => BOARD_ROOMS.find((r) => r.id === id)!;
export const cropOf = (id: string) => CROPS[id];

/** 布局的全称：减 / 分 / 空首次出现时用。 */
export const LAYOUT_NAMES: Record<LayoutId, { short: string; full: string }> = {
  s1: { short: "减", full: "减：沿原来的轴线，少放东西" },
  s2: { short: "分", full: "分：用书架把客厅分成三段" },
  s3: { short: "空", full: "空：把中段留给席地和运动" },
};

/** 改动层级。名称沿用 promept.md 第七节，不得改写；说明是给业主的大白话。 */
export const LEVELS: { id: Level; name: string; plain: string; cost: string; rev: string }[] = [
  { id: "L0", name: "行为与整理", plain: "清空、重新摆放、换个用法，不花钱", cost: "零", rev: "完全可逆" },
  { id: "L1", name: "可移动物品", plain: "灯、窗帘、织物、地毯、活动家具，买来就能用，搬家能带走", cost: "低", rev: "完全可逆" },
  { id: "L2", name: "表面处理", plain: "刷漆、贴膜、换灯具和五金，要请人做，改回去也有成本", cost: "低到中", rev: "部分可逆" },
  { id: "L3", name: "固定构件", plain: "定制柜、轻质隔断、换门，做了就很难撤回", cost: "中", rev: "较难逆转" },
  { id: "L4", name: "结构与管线", plain: "拆墙、开洞、移动水电，只作为需要专业人员评估的选项", cost: "高", rev: "基本不可逆" },
];
export const levelOf = (id: Level) => LEVELS.find((l) => l.id === id)!;

/** 方案的最高层级：席地、木与钢有 L3，素木、暖古典最高到 L2（与装修引擎 maxStage 一致）。 */
export const maxStageOf = (id: SchemeId): Stage => (id === "S2" || id === "S3" ? "L3" : "L2");

/** 长度写法，DESIGN.md 第 8 节：单个长度大于 1000 mm 换算成米、保留 1 位小数。 */
export function fmt(mm: number) {
  return Math.abs(mm) > 1000 ? `${(mm / 1000).toFixed(1)} m` : `${Math.round(mm)} mm`;
}

/** 全屋复算面积，与户型三维的房间列表同一算法。 */
export const TOTAL_AREA = ROOMS.reduce((sum, r) => sum + planArea(r.id), 0);

/** 有彩度、需要方案表态的现状硬装（中性色不算）。 */
export function colouredRetained(id: SchemeId) {
  const f = FACTS.schemes[id].retained;
  return RETAINED.filter((r) => !f[r.id].neutral);
}

/** 方案各层级的改动条数（全屋）。 */
export function levelCounts(s: BScheme) {
  const n: Record<Level, number> = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };
  for (const room of Object.values(s.rooms)) for (const c of room.changes) n[c.level]++;
  return n;
}

export const sceneLabel = (id: Scene) => SCENES.find((s) => s.id === id)?.label ?? id;
export const layoutPieces = (id: LayoutId, scene: Scene): Piece[] => resolvePieces(layoutOf(id), scene);
