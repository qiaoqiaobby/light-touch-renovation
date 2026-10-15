/**
 * 拼贴板页用的全屋底图：房间分工、现状固定件、现状硬装。
 *
 * 坐标与户型三维相同：毫米，x 向东、y 向南，x / y 为平面左上角，w 为东西长，d 为南北深。
 * 房间轮廓和门直接读 src/floorplan/plan-data.ts，这里不重复。
 *
 * 现状固定件来自 viz/src/house.js（VR 全景估计、14 mm/px 旧壳）。换算方法：每个房间取旧壳与净尺寸图上
 * 同一组墙线做线性对应（卧室 A 西墙、东墙、主体北墙、主体南墙；卧室 B 西墙、东墙、北窗段、南墙；
 * 卧室 C、卫生间、厨房取四面墙），只换算位置，柜深与长度保持原值。旧壳与净尺寸图的比例约 0.94。
 * 这些位置仍是估计，待现场复核。
 */

export const BOARD_ROOMS = [
  { id: 'house', name: '全屋' },
  { id: 'L', name: '客厅', plan: 'L', view: [4200, 5400, 9000, 12200], role: '起居、观影、阅读、运动、用餐' },
  { id: 'E', name: '玄关', plan: 'L', view: [4950, 11950, 8350, 14550], role: '入户、换鞋、冰箱与餐边柜' },
  { id: 'A', name: '卧室 A', plan: 'A', role: '主卧，按两人使用' },
  { id: 'B', name: '卧室 B', plan: 'B', role: '平时书房，父母来住时做客房' },
  { id: 'C', name: '卧室 C', plan: 'C', role: '衣帽间兼工作角，承接伴侣入住后的衣物' },
  { id: 'K', name: '厨房', plan: 'K', role: '只做表面处理和小件' },
  { id: 'Bath', name: '卫生间', plan: 'Bath', role: '只做小件；父母来住时的如厕方式要解决' },
];

/** 房间分工沿用 docs/plan/全屋创意设计说明-202610010105.md：A 主卧，B 书房兼客房，C 衣帽间。 */
export const ROLE_SOURCE = '房间分工沿用 2026-10-01 全屋设计的约定（假设，待业主确认）';

/**
 * 现状固定件：各方案都保留。access 为柜门前需要留空的一侧和深度。
 * kind：cabinet 柜体，sill 飘窗台，zone 淋浴区（不放东西），fixture 洁具，stub 墙垛
 */
export const FIXED = [
  { id: 'a-ward', room: 'A', kind: 'cabinet', name: '通顶衣柜', x: 2263, y: 2147, w: 600, d: 2400, h: 2400, swatch: 'base-cabwhite', access: { side: 'e', depth: 450 } },
  { id: 'a-sill', room: 'A', kind: 'sill', name: '飘窗台', x: 2707, y: 288, w: 2231, d: 686, h: 450 },
  { id: 'b-ward', room: 'B', kind: 'cabinet', name: '通顶衣柜', x: 1009, y: 7327, w: 1577, d: 600, h: 2400, swatch: 'base-cabwhite', access: { side: 'n', depth: 450 } },
  { id: 'b-sill', room: 'B', kind: 'sill', name: '转角飘窗台', x: 325, y: 4121, w: 684, d: 1234, h: 450 },
  { id: 'c-ward', room: 'C', kind: 'cabinet', name: '一体柜 · 衣柜段', x: 2705, y: 9599, w: 1200, d: 600, h: 2400, swatch: 'base-cabwhite', access: { side: 'n', depth: 450 } },
  { id: 'c-desk', room: 'C', kind: 'cabinet', name: '一体柜 · 书桌段', x: 3905, y: 9599, w: 1200, d: 600, h: 750, swatch: 'base-cabwhite', access: { side: 'n', depth: 450 } },
  { id: 'bath-shower', room: 'Bath', kind: 'zone', name: '淋浴区', x: 2813, y: 10323, w: 905, d: 913, h: 20 },
  { id: 'bath-stub', room: 'Bath', kind: 'stub', name: '墙垛', x: 4287, y: 10323, w: 128, d: 670, h: 2700 },
  { id: 'bath-squat', room: 'Bath', kind: 'fixture', name: '蹲便', x: 4425, y: 10528, w: 415, d: 558, h: 60 },
  { id: 'bath-van', room: 'Bath', kind: 'cabinet', name: '台盆柜', x: 4114, y: 11524, w: 736, d: 466, h: 850 },
  { id: 'k-washer', room: 'K', kind: 'fixture', name: '洗衣机位', x: 9774, y: 10007, w: 600, d: 600, h: 850 },
  { id: 'k-east', room: 'K', kind: 'cabinet', name: '东墙地柜（水槽）', x: 9774, y: 11184, w: 600, d: 3250, h: 850, swatch: 'base-kitblue' },
  { id: 'k-south', room: 'K', kind: 'cabinet', name: '南墙地柜（灶台）', x: 8728, y: 13834, w: 1046, d: 600, h: 850, swatch: 'base-kitblue' },
];

/**
 * 现状硬装：每个方案逐项决定保留还是改动。swatch 指向 VR 全景裁出的材质块。
 * large 为大面积表面，保留时颜色必须落在方案主色或中性色里，不能只靠点缀色。
 */
export const RETAINED = [
  { id: 'tile', name: '客厅抛光地砖', swatch: 'base-tile', rooms: ['L', 'E'], large: true },
  { id: 'wall', name: '白墙', swatch: 'base-wall', rooms: ['L', 'E', 'A', 'B', 'C'], large: true },
  { id: 'ceiling', name: '吊顶', swatch: 'base-ceiling', rooms: ['L', 'E'], large: true },
  { id: 'blue', name: '蓝色护墙板', swatch: 'base-blue', rooms: ['L'], large: true },
  { id: 'redwood', name: '红棕木柜（餐边柜、鞋柜）', swatch: 'base-redwood', rooms: ['E'], large: true },
  { id: 'cabwhite', name: '卧室白色通顶柜', swatch: 'base-cabwhite', rooms: ['A', 'B', 'C'], large: true },
  { id: 'bedfloor', name: '卧室灰调木纹地板', swatch: 'base-bedfloor', rooms: ['A', 'B', 'C'], large: true, note: '材质按全景判断，待现场确认' },
  { id: 'kitblue', name: '厨房蓝色烤漆橱柜门', swatch: 'base-kitblue', rooms: ['K'], large: false },
];

/** 现状里还有两项不靠颜色判断，单独列出：冷白吸顶灯（各方案都换 2700K 可调光）、蹲便（父母来住的如厕问题）。 */
export const FIXED_NOTES = [
  { id: 'light', name: '冷白吸顶灯', rooms: ['L', 'E'] },
  { id: 'squat', name: '蹲便', rooms: ['Bath'] },
];
