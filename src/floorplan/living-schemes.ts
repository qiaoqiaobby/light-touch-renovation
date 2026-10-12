/**
 * 客厅三方案摆到复尺净尺寸上。
 *
 * 方案页（viz/src/schemes.js）的原点在「推算西墙 × 北墙」，开间按 3600。
 * 核算页的客厅主体是 x 5542–8906、y 6252–11990，开间 3364，进深 5738。
 * 家具尺寸不缩放。靠东墙的物件改贴 8906，靠西墙的贴 5542。
 * 东墙在 y=11990 向西退到 8219，收纳墙不得越过这条折线。
 */
import type { Furn, FurnType } from "./plan-data";

export const HALL = {
  west: 5542,
  east: 8906,
  north: 6252,
  south: 11990,
  bayN: 5473,
  bayW: 5993,
  bayE: 8523,
};

export type Scene = "daily" | "movie" | "dine2" | "party" | "exercise";
export type SchemeId = "s1" | "s2" | "s3";

export const SCENES: { id: Scene; label: string }[] = [
  { id: "daily", label: "日常" },
  { id: "movie", label: "观影" },
  { id: "dine2", label: "双人餐" },
  { id: "party", label: "聚会" },
  { id: "exercise", label: "运动" },
];

type Mount = "floor" | "wall" | "ceiling" | "on";
type Box = { x?: number; y?: number; w?: number; d?: number; h?: number; z?: number; mount?: Mount };

export type Piece = {
  id: string;
  name: string;
  type: FurnType;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  color: string;
  mount?: Mount;
  cover?: boolean;
  occupied?: boolean;
  seat?: number;
  access?: { side: "n" | "s" | "e" | "w"; depth: number };
  only?: Scene[];
  states?: Partial<Record<Scene, Box>>;
};

export type Scheme = {
  id: SchemeId;
  label: string;
  note: string;
  zone: { x: number; y: number; w: number; d: number };
  items: Piece[];
};

const oak = "#e2cfb4";
const linen = "#d9d0c3";
const rug = "#cfc3ae";
const fridge = "#e4e8ea";
const ink = "#2c3338";
const screen = "#d5dde3";
const rush = "#d7c49a";
const cedar = "#c4a574";

const cushion: Piece = {
  id: "sill",
  name: "飘窗坐垫",
  type: "block",
  x: 6120,
  y: 5560,
  w: 2280,
  d: 500,
  h: 80,
  z: 450,
  color: linen,
  mount: "on",
};

/** 玄关：冰箱门朝北，门前 700；餐边柜在西，不挡厨房推拉门。 */
const entry: Piece[] = [
  {
    id: "fridge",
    name: "冰箱",
    type: "fridge",
    x: 7000,
    y: 13300,
    w: 680,
    d: 480,
    h: 1800,
    color: fridge,
    access: { side: "n", depth: 700 },
  },
  {
    id: "side",
    name: "餐边柜",
    type: "block",
    x: 5160,
    y: 13340,
    w: 860,
    d: 400,
    h: 2000,
    color: oak,
  },
  {
    id: "shoe",
    name: "鞋柜",
    type: "block",
    x: 5080,
    y: 12320,
    w: 380,
    d: 720,
    h: 1000,
    color: oak,
  },
];

export const SCHEMES: Scheme[] = [
  {
    id: "s1",
    label: "减",
    note: "幕布改为 65 寸。90 寸和 2.6 m 观看距离是按 3.6 m 开间写的，这张净尺寸图的开间是 3364。",
    zone: { x: 6000, y: 7600, w: 1900, d: 2100 },
    items: [
      cushion,
      { id: "bench", name: "影音矮柜", type: "block", x: 5542, y: 8600, w: 400, d: 1600, h: 380, color: oak },
      {
        id: "screen",
        name: "65 寸幕布",
        type: "block",
        x: 5560,
        y: 8680,
        w: 24,
        d: 1440,
        h: 810,
        z: 700,
        color: screen,
        mount: "wall",
        only: ["movie"],
      },
      {
        id: "proj",
        name: "投影仪",
        type: "block",
        x: 5620,
        y: 9200,
        w: 260,
        d: 280,
        h: 110,
        z: 380,
        color: ink,
        mount: "on",
      },
      { id: "sofa", name: "三人沙发", type: "sofa", x: 7956, y: 7400, w: 950, d: 2400, h: 780, color: linen },
      { id: "rug", name: "地毯", type: "rug", x: 6100, y: 7700, w: 1700, d: 1900, h: 12, color: rug, cover: true },
      {
        id: "sideTable",
        name: "边几",
        type: "block",
        x: 7420,
        y: 8600,
        w: 450,
        d: 450,
        h: 450,
        color: oak,
        states: { exercise: { x: 7420, y: 10040 } },
      },
      { id: "chair", name: "阅读椅", type: "chair", x: 7480, y: 6360, w: 720, d: 700, h: 750, color: linen },
      { id: "shelf", name: "低书架", type: "block", x: 8606, y: 6400, w: 300, d: 860, h: 800, color: oak },
      { id: "lamp", name: "落地灯", type: "block", x: 8280, y: 6420, w: 240, d: 240, h: 1500, color: ink },
      {
        id: "table",
        name: "折叠桌",
        type: "table",
        x: 8656,
        y: 10640,
        w: 250,
        d: 900,
        h: 750,
        color: oak,
        states: {
          dine2: { x: 8056, w: 850 },
          party: { x: 7480, y: 10460, w: 1426 },
        },
      },
      {
        id: "c1",
        name: "餐椅",
        type: "chair",
        x: 8160,
        y: 10640,
        w: 440,
        d: 440,
        h: 800,
        color: oak,
        seat: 1,
        states: { dine2: { x: 8200, y: 10180 }, party: { x: 7800, y: 10000 } },
      },
      {
        id: "c2",
        name: "餐椅",
        type: "chair",
        x: 8160,
        y: 11100,
        w: 440,
        d: 440,
        h: 800,
        color: oak,
        seat: 1,
        states: { dine2: { x: 8460, y: 11560 }, party: { x: 8460, y: 11380 } },
      },
      {
        id: "c3",
        name: "折叠椅",
        type: "chair",
        x: 7020,
        y: 10540,
        w: 440,
        d: 440,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c4",
        name: "折叠椅",
        type: "chair",
        x: 7020,
        y: 10980,
        w: 440,
        d: 440,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c5",
        name: "折叠椅",
        type: "chair",
        x: 7800,
        y: 11380,
        w: 440,
        d: 440,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c6",
        name: "折叠椅",
        type: "chair",
        x: 8460,
        y: 10000,
        w: 440,
        d: 440,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      ...entry,
      {
        id: "mat",
        name: "瑜伽垫",
        type: "rug",
        x: 7280,
        y: 7700,
        w: 600,
        d: 1800,
        h: 8,
        color: "#8aa0b4",
        cover: true,
        occupied: true,
        only: ["exercise"],
      },
    ],
  },
  {
    id: "s2",
    label: "分",
    note: "西侧通道约 0.96 m，不是方案页写的 1.8 m。沙发到幕布约 1.6 m：窗前还要留运动区，净进深放不下原来的 1.9 m。",
    zone: { x: 6600, y: 6280, w: 2200, d: 1080 },
    items: [
      cushion,
      { id: "sofa", name: "三人沙发", type: "sofa", x: 6506, y: 7420, w: 2400, d: 900, h: 780, color: linen },
      { id: "rug", name: "地毯", type: "rug", x: 6800, y: 8380, w: 1600, d: 1400, h: 12, color: rug, cover: true },
      {
        id: "shelf",
        name: "双面书架",
        type: "block",
        x: 7106,
        y: 9960,
        w: 1800,
        d: 340,
        h: 1200,
        color: oak,
      },
      {
        id: "storage",
        name: "收纳墙",
        type: "block",
        x: 8456,
        y: 10740,
        w: 450,
        d: 1220,
        h: 2400,
        color: oak,
        access: { side: "w", depth: 450 },
      },
      {
        id: "screen",
        name: "75 寸幕布",
        type: "block",
        x: 7176,
        y: 9880,
        w: 1660,
        d: 30,
        h: 930,
        z: 1400,
        color: screen,
        mount: "ceiling",
        only: ["movie"],
      },
      {
        id: "table",
        name: "伸缩餐桌",
        type: "table",
        x: 6680,
        y: 10740,
        w: 1000,
        d: 720,
        h: 750,
        color: oak,
        states: { party: { w: 1280 } },
      },
      {
        id: "c1",
        name: "餐椅",
        type: "chair",
        x: 6860,
        y: 10320,
        w: 400,
        d: 400,
        h: 800,
        color: linen,
        seat: 1,
        states: { party: { x: 6720 } },
      },
      {
        id: "c2",
        name: "餐椅",
        type: "chair",
        x: 6860,
        y: 11500,
        w: 400,
        d: 400,
        h: 800,
        color: linen,
        seat: 1,
        states: { party: { x: 6720 } },
      },
      {
        id: "c3",
        name: "折叠椅",
        type: "chair",
        x: 7140,
        y: 10320,
        w: 380,
        d: 400,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c4",
        name: "折叠椅",
        type: "chair",
        x: 7140,
        y: 11500,
        w: 380,
        d: 400,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c5",
        name: "折叠椅",
        type: "chair",
        x: 7560,
        y: 10320,
        w: 380,
        d: 400,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      {
        id: "c6",
        name: "折叠椅",
        type: "chair",
        x: 7560,
        y: 11500,
        w: 380,
        d: 400,
        h: 800,
        color: ink,
        seat: 1,
        only: ["party"],
      },
      ...entry,
      {
        id: "mat",
        name: "瑜伽垫",
        type: "rug",
        x: 6900,
        y: 6400,
        w: 1700,
        d: 580,
        h: 8,
        color: "#8aa0b4",
        cover: true,
        occupied: true,
        only: ["exercise"],
      },
    ],
  },
  {
    id: "s3",
    label: "空",
    note: "墙面投影改为约 55 寸。方案页的 80 寸在这个开间上观看距离只有约 2.4 m。矮榻起身不便仍是这个方案的代价。",
    zone: { x: 6000, y: 7480, w: 1980, d: 2200 },
    items: [
      cushion,
      { id: "bench", name: "投影凳", type: "block", x: 5542, y: 8200, w: 350, d: 1400, h: 300, color: cedar },
      {
        id: "proj",
        name: "超短焦投影",
        type: "block",
        x: 5600,
        y: 8700,
        w: 240,
        d: 280,
        h: 100,
        z: 300,
        color: ink,
        mount: "on",
      },
      {
        id: "screen",
        name: "墙面投影",
        type: "block",
        x: 5560,
        y: 8300,
        w: 16,
        d: 1220,
        h: 690,
        z: 800,
        color: screen,
        mount: "wall",
        only: ["movie"],
      },
      { id: "daybed", name: "矮榻", type: "block", x: 8006, y: 7600, w: 900, d: 1800, h: 300, color: cedar },
      { id: "rush", name: "蔺草地垫", type: "rug", x: 6200, y: 7600, w: 1700, d: 2000, h: 15, color: rush, cover: true },
      {
        id: "table",
        name: "壁挂折叠桌",
        type: "table",
        x: 8786,
        y: 10200,
        w: 120,
        d: 1100,
        h: 750,
        color: cedar,
        states: {
          dine2: { x: 8306, w: 600 },
          party: { x: 7706, w: 1200 },
        },
      },
      {
        id: "s1",
        name: "叠放凳",
        type: "chair",
        x: 7860,
        y: 10340,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["dine2", "party"],
        states: { party: { x: 7280, y: 10240 } },
      },
      {
        id: "s2",
        name: "叠放凳",
        type: "chair",
        x: 7860,
        y: 10840,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["dine2", "party"],
        states: { party: { x: 7280, y: 10680 } },
      },
      {
        id: "s3",
        name: "叠放凳",
        type: "chair",
        x: 7280,
        y: 11120,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["party"],
      },
      {
        id: "s4",
        name: "叠放凳",
        type: "chair",
        x: 7900,
        y: 9780,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["party"],
      },
      {
        id: "s5",
        name: "叠放凳",
        type: "chair",
        x: 8400,
        y: 9780,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["party"],
      },
      {
        id: "s6",
        name: "叠放凳",
        type: "chair",
        x: 7900,
        y: 11340,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["party"],
      },
      {
        id: "s7",
        name: "叠放凳",
        type: "chair",
        x: 8400,
        y: 11340,
        w: 380,
        d: 380,
        h: 450,
        color: cedar,
        seat: 1,
        only: ["party"],
      },
      { id: "store", name: "储物墙", type: "block", x: 5160, y: 13320, w: 1700, d: 420, h: 2400, color: cedar },
      {
        id: "fridge",
        name: "冰箱",
        type: "fridge",
        x: 7000,
        y: 13300,
        w: 680,
        d: 480,
        h: 1800,
        color: fridge,
        access: { side: "n", depth: 700 },
      },
      { id: "shoe", name: "鞋柜", type: "block", x: 5080, y: 12320, w: 380, d: 720, h: 1000, color: cedar },
      {
        id: "mat",
        name: "瑜伽垫",
        type: "rug",
        x: 7360,
        y: 7900,
        w: 580,
        d: 1700,
        h: 8,
        color: "#8aa0b4",
        cover: true,
        occupied: true,
        only: ["exercise"],
      },
    ],
  },
];

export function resolvePieces(scheme: Scheme, scene: Scene): Piece[] {
  const out: Piece[] = [];
  for (const item of scheme.items) {
    if (item.only && !item.only.includes(scene)) continue;
    const over = item.states?.[scene] ?? {};
    out.push({ ...item, ...over, states: undefined, only: undefined });
  }
  return out;
}

export function toFurn(piece: Piece): Furn {
  return {
    id: piece.id,
    type: piece.type,
    name: piece.name,
    room: "L",
    cx: piece.x + piece.w / 2,
    cy: piece.y + piece.d / 2,
    w: piece.w,
    d: piece.d,
    rot: 0,
    color: piece.color,
    h: piece.h,
    z: piece.z ?? 0,
  };
}
