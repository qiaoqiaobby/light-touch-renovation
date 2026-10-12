/** Net interior dimensions from the survey, millimetres, +x east, +y south. */

export type Pt = [number, number];

export type Room = {
  id: string;
  name: string;
  zone: "bed" | "live" | "wet";
  /** Area printed on the source drawing, m². */
  label: number;
  poly: Pt[];
  glass: { edge: number; sill: number }[];
  main: [string, string];
  facts: { k: string; v: string; exact?: boolean }[];
  tip: string;
  floor: string;
};

export type Door = {
  id: string;
  name: string;
  kind: "swing" | "slide";
  axis: "h" | "v";
  /** Jambs along the wall, mm. Hinge is j[1] for swings. */
  j: [number, number];
  /** The two wall faces, mm. */
  w: [number, number];
  /** Swing direction in the across-axis: -1 = north/west, +1 = south/east. */
  into?: -1 | 1;
  width: number;
  where: string;
  how: string;
  tip: string;
  head: number;
};

export type FurnType =
  | "bed"
  | "wardrobe"
  | "desk"
  | "chair"
  | "sofa"
  | "table"
  | "coffeetable"
  | "tvstand"
  | "rug"
  | "plant"
  | "toilet"
  | "vanity"
  | "shower"
  | "counter"
  | "fridge";

export type Furn = {
  id: string;
  type: FurnType;
  name: string;
  room: string;
  cx: number;
  cy: number;
  w: number;
  d: number;
  /** Degrees clockwise in plan. Matches the floorplan-3d convention. */
  rot: number;
  color: string;
};

export const CEILING = 2.7;
export const SECTION = 1.15;
export const EYE = 1.58;

export const ROOMS: Room[] = [
  {
    id: "A",
    name: "卧室 A",
    zone: "bed",
    label: 14.3,
    floor: "#e4d0ae",
    poly: [
      [2707, 288],
      [4938, 288],
      [4938, 1074],
      [5365, 1074],
      [5365, 6116],
      [4246, 6116],
      [4246, 4547],
      [2263, 4547],
      [2263, 974],
      [2707, 974],
    ],
    glass: [{ edge: 0, sill: 0.45 }],
    main: ["3100 × 3570", "主体东西 × 南北，约 11.1 ㎡"],
    facts: [
      { k: "北侧窗洞", v: "2235 × 690–790", exact: true },
      { k: "入门过道", v: "1120 × 1580" },
      { k: "最大进深", v: "5830（窗到门墙）" },
    ],
    tip: "主体可放 1.8 × 2.0 m 床：床头靠西墙，东侧约留 1.0 m。南北放下床宽后还够 600 深衣柜。",
  },
  {
    id: "B",
    name: "卧室 B",
    zone: "bed",
    label: 11,
    floor: "#dcc4a0",
    poly: [
      [325, 4121],
      [2136, 4121],
      [2136, 4674],
      [4117, 4674],
      [4117, 7549],
      [2586, 7549],
      [2586, 7927],
      [1009, 7927],
      [1009, 5355],
      [325, 5355],
    ],
    glass: [
      { edge: 0, sill: 0.45 },
      { edge: 9, sill: 0.45 },
    ],
    main: ["3110 × 2870", "主体东西 × 南北，约 8.9 ㎡"],
    facts: [
      { k: "北窗段", v: "1811 × 560", exact: true },
      { k: "西南段", v: "1581", exact: true },
      { k: "最大进深", v: "3810（北窗到南墙）" },
    ],
    tip: "南北 2870 是瓶颈。模型里放了 1.5 m 宽的床，床头靠西；东墙门北侧放书桌。1.8 m 床再加衣柜会很挤。",
  },
  {
    id: "C",
    name: "卧室 C",
    zone: "bed",
    label: 6.8,
    floor: "#e7d6b8",
    poly: [
      [2705, 7678],
      [5415, 7678],
      [5415, 10199],
      [2705, 10199],
    ],
    glass: [{ edge: 3, sill: 0.9 }],
    main: ["2710 × 2520", "东西（窗到墙）× 南北"],
    facts: [
      { k: "形状", v: "规整矩形" },
      { k: "西墙", v: "整面为窗" },
    ],
    tip: "适合 1.2 m 床加书桌。1.5 m 床横放后南北只剩约 1 m，再放衣柜通道就不够了。",
  },
  {
    id: "Bath",
    name: "卫生间",
    zone: "wet",
    label: 4.3,
    floor: "#d5ddd8",
    poly: [
      [2813, 10323],
      [5415, 10323],
      [5415, 11990],
      [2813, 11990],
    ],
    glass: [],
    main: ["2600 × 1670", "东西 × 南北"],
    facts: [
      { k: "北墙墙垛", v: "130 × 660" },
      { k: "墙垛分出", v: "西 1470 ｜ 东 1000" },
    ],
    tip: "墙垛以东约 1000 宽，做了 900 × 900 淋浴。西侧留给马桶和台盆。门是推拉，不占室内。",
  },
  {
    id: "K",
    name: "厨房",
    zone: "wet",
    label: 7.3,
    floor: "#ddd6c8",
    poly: [
      [9030, 9988],
      [10374, 9988],
      [10374, 14434],
      [8728, 14434],
      [8728, 13801],
      [8328, 13801],
      [8328, 12114],
      [9030, 12114],
    ],
    glass: [{ edge: 0, sill: 1.0 }],
    main: ["东墙通长 4450", "北窗到南墙"],
    facts: [
      { k: "北段", v: "1348 × 2130", exact: true },
      { k: "中段", v: "2050 × 1690" },
      { k: "南段", v: "1649 × 640", exact: true },
    ],
    tip: "东墙做了一字台面。北段柜深 600 后通道只剩约 750，低于常用的 800–900。冰箱放在南端。",
  },
  {
    id: "L",
    name: "客厅",
    zone: "live",
    label: 29.7,
    floor: "#e5e0d4",
    poly: [
      [5993, 5473],
      [8523, 5473],
      [8523, 6252],
      [8906, 6252],
      [8906, 11990],
      [8219, 11990],
      [8219, 13801],
      [6818, 13801],
      [6818, 14484],
      [5509, 14484],
      [5509, 14200],
      [5013, 14200],
      [5013, 12113],
      [5542, 12113],
      [5542, 7550],
      [4239, 7550],
      [4239, 6233],
      [5993, 6233],
    ],
    glass: [
      { edge: 0, sill: 0.45 },
      { edge: 11, sill: 0.85 },
    ],
    main: ["3360 × 5740", "主体东西 × 南北，约 19.3 ㎡"],
    facts: [
      { k: "北窗段", v: "2532 × 760", exact: true },
      { k: "北侧通道", v: "4670 × 1320" },
      { k: "玄关入户", v: "1316", exact: true },
      { k: "总进深", v: "8330（北窗到南墙）" },
    ],
    tip: "开间 3360：沙发约 0.9 m、电视柜约 0.4 m，观看距离约 2.0 m，适合 55–65 寸。六扇门都朝向这个空间。",
  },
];

/** Plumbing pier inside the bathroom, millimetres [x0, y0, x1, y1]. */
export const BATH_STUB: [number, number, number, number] = [4287, 10323, 4415, 10993];

export const DOORS: Door[] = [
  {
    id: "M1",
    name: "入户门",
    kind: "swing",
    axis: "h",
    j: [5620, 6414.2],
    w: [14483.6, 14705.9],
    into: -1,
    width: 794,
    where: "南外墙 · 玄关",
    how: "平开 · 向内 · 铰链在东",
    tip: "图上洞宽和卧室门几乎一样，更像统一门图块，订门前要现场量洞口。",
    head: 2.2,
  },
  {
    id: "M2",
    name: "厨房门",
    kind: "slide",
    axis: "v",
    j: [12252.2, 13646.2],
    w: [8218.7, 8328.1],
    width: 1394,
    where: "厨房西侧 · 通客厅",
    how: "推拉 · 两扇",
    tip: "全屋最宽的门洞。打开后厨房中段和客厅南段基本连通。",
    head: 2.2,
  },
  {
    id: "M3",
    name: "卫生间门",
    kind: "slide",
    axis: "v",
    j: [10974.2, 11869.7],
    w: [5415.3, 5541.9],
    width: 895,
    where: "卫生间东墙南端",
    how: "推拉 · 两扇",
    tip: "不占卫生间内部。门北侧约 650 是东墙上仅有的靠墙位置。",
    head: 2.1,
  },
  {
    id: "M4",
    name: "卧室 C 门",
    kind: "swing",
    axis: "h",
    j: [4465.8, 5264.4],
    w: [7549.5, 7677.8],
    into: 1,
    width: 799,
    where: "卧室 C 北墙东端",
    how: "平开 · 向室内 · 铰链在东",
    tip: "开启扇区占东北角约 0.8 m。西侧北墙约 1.75 m，模型里放了书桌。",
    head: 2.05,
  },
  {
    id: "M5",
    name: "卧室 B 门",
    kind: "swing",
    axis: "v",
    j: [6374.3, 7173.1],
    w: [4116.8, 4239.3],
    into: -1,
    width: 799,
    where: "卧室 B 东墙南段",
    how: "平开 · 向室内 · 铰链在南",
    tip: "门北侧东墙约 1.7 m。门扇向室内开，占东南角。",
    head: 2.05,
  },
  {
    id: "M6",
    name: "卧室 A 门",
    kind: "swing",
    axis: "h",
    j: [4393.1, 5187],
    w: [6116, 6232.9],
    into: -1,
    width: 794,
    where: "卧室 A 过道南端",
    how: "平开 · 向室内 · 铰链在东",
    tip: "开在 1120 宽的入门过道里，不占卧室主体。",
    head: 2.05,
  },
];

export const FURNITURE: Furn[] = [
  { id: "a-bed", type: "bed", name: "1.8 m 床", room: "A", cx: 3313, cy: 2074, w: 1800, d: 2000, rot: 270, color: "#c5d0d8" },
  { id: "a-ward", type: "wardrobe", name: "衣柜", room: "A", cx: 3200, cy: 4247, w: 1800, d: 600, rot: 180, color: "#efe6d6" },
  { id: "b-bed", type: "bed", name: "1.5 m 床", room: "B", cx: 2009, cy: 6200, w: 1500, d: 1900, rot: 270, color: "#d4c4d6" },
  { id: "b-desk", type: "desk", name: "书桌", room: "B", cx: 3842, cy: 5474, w: 1200, d: 550, rot: 90, color: "#e2cfb4" },
  { id: "c-bed", type: "bed", name: "1.2 m 床", room: "C", cx: 4375, cy: 9550, w: 1200, d: 2000, rot: 90, color: "#e4d3b4" },
  { id: "c-desk", type: "desk", name: "书桌", room: "C", cx: 3405, cy: 7993, w: 1100, d: 550, rot: 0, color: "#e2cfb4" },
  { id: "c-chair", type: "chair", name: "椅子", room: "C", cx: 3405, cy: 8508, w: 450, d: 480, rot: 180, color: "#cfc6b8" },
  { id: "bath-sh", type: "shower", name: "淋浴", room: "Bath", cx: 4895, cy: 10793, w: 900, d: 900, rot: 0, color: "#d5e3ea" },
  { id: "bath-wc", type: "toilet", name: "马桶", room: "Bath", cx: 3600, cy: 11610, w: 400, d: 680, rot: 180, color: "#f4f7f8" },
  { id: "bath-van", type: "vanity", name: "台盆", room: "Bath", cx: 3073, cy: 10780, w: 800, d: 480, rot: 270, color: "#e7eef1" },
  { id: "k-cnt", type: "counter", name: "橱柜", room: "K", cx: 10074, cy: 11788, w: 3600, d: 600, rot: 90, color: "#e7e2d8" },
  { id: "k-fr", type: "fridge", name: "冰箱", room: "K", cx: 10020, cy: 14020, w: 700, d: 700, rot: 0, color: "#e4e8ea" },
  { id: "l-tv", type: "tvstand", name: "电视柜", room: "L", cx: 5742, cy: 10050, w: 2000, d: 400, rot: 270, color: "#e2cfb4" },
  { id: "l-sofa", type: "sofa", name: "沙发", room: "L", cx: 8406, cy: 10050, w: 2300, d: 900, rot: 90, color: "#b7c4b0" },
  { id: "l-ct", type: "coffeetable", name: "茶几", room: "L", cx: 6949, cy: 10050, w: 1100, d: 600, rot: 0, color: "#e6dcc8" },
  { id: "l-rug", type: "rug", name: "地毯", room: "L", cx: 7200, cy: 10050, w: 2000, d: 2800, rot: 0, color: "#d2c6b4" },
  { id: "l-plant", type: "plant", name: "绿植", room: "L", cx: 8520, cy: 7900, w: 460, d: 460, rot: 0, color: "#7ea36a" },
  { id: "l-table", type: "table", name: "餐桌", room: "L", cx: 7200, cy: 12800, w: 1200, d: 750, rot: 0, color: "#e2cfb4" },
  { id: "l-ch1", type: "chair", name: "餐椅", room: "L", cx: 7200, cy: 12185, w: 450, d: 480, rot: 0, color: "#cfc6b8" },
  { id: "l-ch2", type: "chair", name: "餐椅", room: "L", cx: 7200, cy: 13415, w: 450, d: 480, rot: 180, color: "#cfc6b8" },
];

/** Walk spawn, plan millimetres, inside the living room. */
export const SPAWN: Pt = [7000, 10880];
