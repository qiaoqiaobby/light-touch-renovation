// 客厅外壳几何（单位 mm）
// 来源：VR/231348_751.png 户型图，按标注面积与门扇宽度交叉推算的 14 mm/px 比例读出，全部待现场复核。
// 坐标：原点在主厅西墙内侧与北墙交点，x 向东，y 向南。

export const SURVEY = {
  source: 'VR/231348_751.png',
  scale: '14 mm/px（面积与门宽交叉推算；尺寸标注推算约 10.5 mm/px，两者冲突）',
  status: '待现场复核',
  keyCheck: '电视墙到沙发墙的净宽，推算值 3.6 m',
};

export const CEILING = 2750;      // 层高，假设值
export const WALL_T = 120;        // 墙厚，仅用于绘制

// 室内轮廓，顺序连接
export const ROOM = [
  [-1390, 0], [0, 0], [480, 0], [480, -670], [3190, -670], [3190, 0], [3600, 0],
  [3600, 6270], [2870, 6270], [2870, 8190], [-550, 8190], [-550, 6270], [0, 6270],
  [0, 1540], [-1390, 1540],
];

// 开口：edge 为 ROOM 中起点下标，from/to 为沿墙方向的绝对坐标（水平边取 x，竖直边取 y）
// kind: door | window | open；fill 为开口内的门扇或玻璃材质
export const OPENINGS = [
  { edge: 0,  from: -1200, to: -360, bottom: 0,    top: 2100, kind: 'door',   fill: 'doorWhite', name: '卧室 A 门' },
  { edge: 3,  from: 480,   to: 3190, bottom: 450,  top: 2400, kind: 'window', fill: 'glass',     name: '北向飘窗' },
  { edge: 8,  from: 6450,  to: 7550, bottom: 0,    top: 2100, kind: 'door',   fill: 'doorGlass', name: '厨房推拉门' },
  { edge: 9,  from: 130,   to: 940,  bottom: 0,    top: 2100, kind: 'door',   fill: 'doorEntry', name: '入户门' },
  { edge: 10, from: 6600,  to: 7900, bottom: 1050, top: 2100, kind: 'window', fill: 'glass',     name: '入户区西窗' },
  { edge: 12, from: 4900,  to: 6100, bottom: 0,    top: 2200, kind: 'open',   fill: null,        name: '卫生间开口' },
  { edge: 13, from: -1120, to: -280, bottom: 0,    top: 2100, kind: 'door',   fill: 'doorWhite', name: '卧室 C 门' }, // 过道南墙（2026-10-01 按户型图放大与全景 7 更正，原误标在主厅西墙）
  { edge: 14, from: 280,   to: 1120, bottom: 0,    top: 2100, kind: 'door',   fill: 'doorWhite', name: '卧室 B 门' },
];

// 西墙原电视墙段，方案可改其墙面材质
export const MEDIA_WALL = { edge: 12, from: 2450, to: 4540 };

// 保留的固定物（各模型共用）
export const FIXED = [
  { id: 'sill', name: '飘窗台', x: 480, y: -670, w: 2710, d: 670, h: 450, mat: 'sill' },
  { id: 'ac', name: '空调柜机', x: 3250, y: 50, w: 350, d: 350, h: 1800, mat: 'acWhite' },
];

// 通行校验：起点与必须可达的目标（均距墙 ≥ 450，留出栅格误差）
export const ROUTE = {
  start: { name: '入户门内', x: 535, y: 7750 },
  targets: [
    { name: '卫生间', x: 450, y: 5500 },
    { name: '卧室 C 门', x: -700, y: 1090 },
    { name: '卧室 A/B 过道', x: -700, y: 770 },
    { name: '厨房门', x: 2450, y: 7000 },
  ],
  clearance: 800,
};
