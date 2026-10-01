// 全屋外壳（客厅以外的房间）：卧室 A/B/C、卫生间、厨房，两页共用，只建模、不做设计
// 来源：VR/231348_751.png 户型图，沿用 geometry.js 的 14 mm/px 与原点，x = (px − 551) × 14，y = (py − 745) × 14，取整到 10 mm。
// 墙段直接读自户型图上的墙体像素，每段只列一次；与客厅相邻处吸附到客厅墙外皮（客厅墙由 geometry.js 生成，这里不重复）。
// 固定件与上一任住户家具按 VR 全景（场景 1、3、7–13）估计位置与尺寸。以上全部待现场复核。
// 户型图与全景冲突时，几何（墙、门窗）取户型图，物件位置取全景并在此记录：
// - 卧室 A：全景里床头与挂机空调在窗龛西侧的北墙上，户型图该段只有 460 mm；床按户型图放在窗龛前，空调放西墙北端。
// - 卧室 B 北墙 x −4790..−3740：户型图为窗，全景 10 看似实墙；按户型图取窗。
// 其他房间按剖切模型表达：墙与物件都只画到剖切高度 CUT_H，高于剖切面的物件（挂机空调、吊柜、油烟机、热水器）画成地面上的半透明投影。
import { ROOM, WALL_T } from './geometry.js';

export const CUT_H = 1200;          // 其他房间墙体的剖切高度，避免遮挡客厅
export const WIN_BAND = 100;        // 窗台高于剖切高度时，在剖切口露出的玻璃带高度，仅示意窗位（比普通窗的玻璃明显更窄）
const CAP_H = 6;                    // 剖切面（墙顶深色层）厚度
const GHOST_H = 4;                  // 高处物件地面投影的厚度

export const HOUSE_NOTE = '其他房间按户型图读取，面积比标注大约 13%，待现场复核';

// 房间内轮廓（顺序连接）；label 为房间名标签位置；area 为户型图标注面积（㎡）
export const HOUSE_ROOMS = [
  { id: 'bedA', name: '卧室 A', area: 14.3, label: [-1900, -3500],
    poly: [[-3460, -5450], [-3000, -5450], [-3000, -6230], [-630, -6230], [-630, -5350], [-170, -5350], [-170, -120], [-1370, -120], [-1370, -1650], [-3460, -1650]] },
  { id: 'bedB', name: '卧室 B', area: 11.0, label: [-3300, 600],
    poly: [[-5610, -2070], [-3600, -2070], [-3600, -1530], [-1510, -1530], [-1510, 1550], [-3110, 1550], [-3110, 1950], [-4790, 1950], [-4790, -800], [-5610, -800]] },
  { id: 'bedC', name: '卧室 C', area: 6.8, label: [-1600, 3000],
    poly: [[-2980, 1660], [-120, 1660], [-120, 4350], [-2980, 4350]] },
  { id: 'bath', name: '卫生间', area: 4.3, wet: true, label: [-2000, 5900],
    poly: [[-2880, 4480], [-1320, 4480], [-1320, 5180], [-1200, 5180], [-1200, 4480], [-120, 4480], [-120, 6150], [-670, 6150], [-670, 6270], [-2880, 6270]] },
  { id: 'kitchen', name: '厨房', area: 7.3, wet: true, label: [4300, 7200],
    poly: [[3720, 4130], [5140, 4130], [5140, 8850], [3390, 8850], [3390, 8190], [2990, 8190], [2990, 6390], [3720, 6390]] },
];

// 墙段：矩形 x0–x1、y0–y1（mm），高到剖切高度；win 为沿墙方向的窗洞 [from, to, 窗台高]
export const HOUSE_WALLS = [
  // 卧室 A
  { x0: -3710, x1: -3460, y0: -5450, y1: -2070 },                         // 西墙
  { x0: -3600, x1: -3460, y0: -2070, y1: -1650 },                         // 西墙南段（与卧室 B 相接处变薄）
  { x0: -3710, x1: -3250, y0: -5700, y1: -5450 },                         // 北墙西段
  { x0: -3250, x1: -3000, y0: -6400, y1: -5450 },                         // 窗龛西侧
  { x0: -3000, x1: -630, y0: -6400, y1: -6230, win: [-2900, -730, 450] }, // 北向窗（窗龛内飘窗台高 450）
  { x0: -630, x1: -380, y0: -6400, y1: -5350 },                           // 窗龛东侧
  { x0: -380, x1: 80, y0: -5600, y1: -5350 },                             // 北墙东段
  { x0: -170, x1: 80, y0: -5350, y1: -120 },                              // 东墙
  { x0: 240, x1: 360, y0: -790, y1: -120 },                               // 客厅飘窗西侧墙垛（x 80–240 为户外凹口）
  { x0: -3600, x1: -1510, y0: -1650, y1: -1530 },                         // 卧室 A / B 隔墙
  { x0: -1510, x1: -1370, y0: -1650, y1: -120 },                          // 卧室 A 门廊 / 卧室 B 隔墙
  // 卧室 B
  { x0: -5610, x1: -4790, y0: -2320, y1: -2070, win: [-5610, -4790, 450] }, // 转角窗北侧
  { x0: -4790, x1: -3710, y0: -2320, y1: -2070, win: [-4790, -3740, 900] }, // 北墙与北窗（户型图为窗，窗台高待复核）
  { x0: -5860, x1: -5610, y0: -2320, y1: -800, win: [-2070, -800, 450] },  // 转角窗西侧
  { x0: -5860, x1: -4790, y0: -800, y1: -550 },                           // 窗龛南墙
  { x0: -5040, x1: -4790, y0: -550, y1: 2210 },                           // 西墙
  { x0: -4790, x1: -3110, y0: 1950, y1: 2210 },                           // 南墙
  { x0: -3110, x1: -1510, y0: 1550, y1: 1660 },                           // 卧室 B / C 隔墙
  // 卧室 C 与卫生间
  { x0: -3110, x1: -2980, y0: 1660, y1: 4480, win: [2170, 3750, 900] },   // 卧室 C 西墙与西窗（窗在一体柜北侧）
  { x0: -2980, x1: -120, y0: 4350, y1: 4480 },                            // 卧室 C / 卫生间隔墙
  { x0: -3110, x1: -2880, y0: 4480, y1: 6270, win: [4900, 5740, 1400] },  // 卫生间西墙与小窗
  { x0: -3110, x1: -670, y0: 6270, y1: 6510 },                            // 卫生间南墙
  { x0: -1320, x1: -1200, y0: 4480, y1: 5180 },                           // 卫生间淋浴区短隔墙
  // 厨房
  { x0: 3720, x1: 5390, y0: 3880, y1: 4130, win: [3860, 5000, 0] },       // 北墙与落地窗（全景 3）
  { x0: 5140, x1: 5390, y0: 4130, y1: 9100 },                             // 东墙
  { x0: 3390, x1: 5140, y0: 8850, y1: 9100 },                             // 南墙
  { x0: 2990, x1: 3390, y0: 8190, y1: 8430 },                             // 厨房西南小间南墙
  { x0: 2870, x1: 2990, y0: 8310, y1: 8430 },                             // 与入户南墙相接
  { x0: 3140, x1: 3390, y0: 8430, y1: 9100 },                             // 入户东南角墙垛
];

// 物件：kind 为 fixed（固定件，各模型都有）或 prior（上一任住户家具，只在「现状」出现）
// 坐标同客厅：x、y 为平面左上角，w 为东西长，d 为南北深，z 为离地高度
export const HOUSE_ITEMS = [
  // 卧室 A（场景 11–13）
  { room: 'bedA', kind: 'fixed', name: '飘窗台', shape: 'box', x: -3000, y: -6230, w: 2370, d: 780, h: 450, mat: 'sill' },
  { room: 'bedA', kind: 'fixed', name: '通顶衣柜', shape: 'box', x: -3460, y: -4050, w: 600, d: 2400, h: 2400, mat: 'cabinetWhite' },
  { room: 'bedA', kind: 'fixed', name: '挂机空调', shape: 'box', x: -3460, y: -5400, w: 200, d: 800, h: 300, z: 2200, mat: 'acWhite' },
  { room: 'bedA', kind: 'prior', name: '双人床', shape: 'bed', head: 'n', x: -2560, y: -5450, w: 1500, d: 2000, h: 1000, mat: 'cabinetWhite', mat2: 'bedding' },
  { room: 'bedA', kind: 'prior', name: '床头柜', shape: 'box', x: -3010, y: -5450, w: 440, d: 400, h: 500, mat: 'cabinetWhite' },
  // 卧室 B（场景 9、10）
  { room: 'bedB', kind: 'fixed', name: '转角飘窗台', shape: 'box', x: -5610, y: -2070, w: 820, d: 1270, h: 450, mat: 'sill' },
  { room: 'bedB', kind: 'fixed', name: '通顶衣柜', shape: 'box', x: -4790, y: 1350, w: 1680, d: 600, h: 2400, mat: 'cabinetWhite' },
  { room: 'bedB', kind: 'fixed', name: '挂机空调', shape: 'box', x: -4790, y: -300, w: 200, d: 800, h: 300, z: 2200, mat: 'acWhite' },
  { room: 'bedB', kind: 'prior', name: '1.5 m 床', shape: 'bed', head: 'e', x: -3510, y: -1450, w: 2000, d: 1500, h: 1000, mat: 'cabinetWhite', mat2: 'bedding' },
  { room: 'bedB', kind: 'prior', name: '椅子', shape: 'chair', face: 'e', x: -4700, y: -1450, w: 450, d: 450, h: 850, mat: 'whiteTop', mat2: 'blackLeg' },
  // 卧室 C（场景 7、8）
  { room: 'bedC', kind: 'fixed', name: '一体柜：衣柜段', shape: 'box', x: -2980, y: 3750, w: 1200, d: 600, h: 2400, mat: 'cabinetWhite' },
  { room: 'bedC', kind: 'fixed', name: '一体柜：书桌', shape: 'desk', x: -1780, y: 3750, w: 1200, d: 600, h: 750, mat: 'cabinetWhite' },
  { room: 'bedC', kind: 'fixed', name: '一体柜：开放书架', shape: 'box', x: -1780, y: 4050, w: 1200, d: 300, h: 900, z: 1100, mat: 'cabinetWhite' },
  { room: 'bedC', kind: 'fixed', name: '一体柜：顶柜', shape: 'box', x: -1780, y: 3750, w: 1200, d: 600, h: 400, z: 2000, mat: 'cabinetWhite' },
  { room: 'bedC', kind: 'prior', name: '书桌椅', shape: 'chair', face: 's', x: -1400, y: 3250, w: 450, d: 450, h: 850, mat: 'whiteTop', mat2: 'blackLeg' },
  { room: 'bedC', kind: 'prior', name: '椅子', shape: 'chair', face: 'n', x: -2400, y: 2200, w: 450, d: 450, h: 850, mat: 'whiteTop', mat2: 'blackLeg' },
  { room: 'bedC', kind: 'prior', name: '矮柜', shape: 'box', x: -2400, y: 1660, w: 1200, d: 400, h: 450, mat: 'whiteTop' },
  // 卫生间（场景 1）
  { room: 'bath', kind: 'fixed', name: '淋浴区挡水', shape: 'box', x: -2880, y: 5460, w: 960, d: 20, h: 1900, mat: 'glass' },
  { room: 'bath', kind: 'fixed', name: '淋浴区地面', shape: 'box', x: -2880, y: 4480, w: 960, d: 980, h: 20, mat: 'wetTile' },
  { room: 'bath', kind: 'fixed', name: '蹲便', shape: 'box', x: -1170, y: 4700, w: 440, d: 600, h: 60, mat: 'ceramic' },
  { room: 'bath', kind: 'fixed', name: '明装水箱', shape: 'box', x: -1170, y: 4480, w: 440, d: 180, h: 450, z: 1050, mat: 'ceramic' },
  { room: 'bath', kind: 'fixed', name: '台盆柜', shape: 'counter', x: -1500, y: 5770, w: 780, d: 500, h: 850, mat: 'cabinetWhite', mat2: 'ceramic' },
  // 厨房（场景 3）
  { room: 'kitchen', kind: 'fixed', name: '东墙地柜（含水槽）', shape: 'counter', x: 4540, y: 5400, w: 600, d: 3450, h: 850, mat: 'kitchenBlue', mat2: 'counterStone' },
  { room: 'kitchen', kind: 'fixed', name: '南墙地柜（含灶台）', shape: 'counter', x: 3390, y: 8250, w: 1150, d: 600, h: 850, mat: 'kitchenBlue', mat2: 'counterStone' },
  { room: 'kitchen', kind: 'fixed', name: '水槽', shape: 'box', x: 4640, y: 6700, w: 400, d: 700, h: 10, z: 850, mat: 'steel' },
  { room: 'kitchen', kind: 'fixed', name: '双眼灶', shape: 'box', x: 3700, y: 8330, w: 720, d: 420, h: 20, z: 850, mat: 'applianceBlack' },
  { room: 'kitchen', kind: 'fixed', name: '油烟机', shape: 'box', x: 3760, y: 8500, w: 600, d: 350, h: 500, z: 1600, mat: 'applianceBlack' },
  { room: 'kitchen', kind: 'fixed', name: '东墙吊柜', shape: 'box', x: 4790, y: 6200, w: 350, d: 2650, h: 700, z: 1600, mat: 'cabinetWhite' },
  { room: 'kitchen', kind: 'fixed', name: '燃气热水器', shape: 'box', x: 4940, y: 4200, w: 200, d: 400, h: 650, z: 1500, mat: 'plasticWhite' }, // 东墙、洗衣机上方（全景 3）
  { room: 'kitchen', kind: 'prior', name: '洗衣机', shape: 'box', x: 4540, y: 4150, w: 600, d: 600, h: 850, mat: 'applianceBlack' },
  { room: 'kitchen', kind: 'prior', name: '黑色矮柜（放烤箱）', shape: 'box', x: 4590, y: 4760, w: 550, d: 620, h: 850, mat: 'applianceBlack' },
];

// 每个门洞内侧 600 mm 须留空（门洞位置取自 geometry.js 的 OPENINGS，这里给出进入房间一侧的净空矩形）
// swing 为平开门的门扇扫掠（户型图门弧）：hinge 门轴，r 门宽，qx / qy 为扫掠所在象限的方向；推拉门没有 swing
export const HOUSE_DOORS = [
  { room: 'bedA', name: '卧室 A 门', x: -1200, y: -720, w: 840, d: 600, swing: { hinge: [-360, -120], r: 840, qx: -1, qy: -1 } },
  { room: 'bedB', name: '卧室 B 门', x: -2110, y: 280, w: 600, d: 840, swing: { hinge: [-1510, 1120], r: 840, qx: -1, qy: -1 } },
  { room: 'bedC', name: '卧室 C 门', x: -1120, y: 1660, w: 840, d: 600, swing: { hinge: [-280, 1660], r: 840, qx: -1, qy: 1 } },
  { room: 'bath', name: '卫生间开口', x: -720, y: 4900, w: 600, d: 1200 },
  { room: 'kitchen', name: '厨房推拉门', x: 2990, y: 6450, w: 600, d: 1100 },
];

// 方案校验用的可达目标：从门内净空中心出发，净宽 ≥ 500 能走到（床位另按床边判断）
export const HOUSE_REACH = [
  { room: 'bedC', name: '北墙衣柜前', x: -2100, y: 2530 },
  { room: 'bedC', name: '一体柜前', x: -1180, y: 3480 },
  { room: 'kitchen', name: '水槽前', x: 4270, y: 7050 },
  { room: 'kitchen', name: '灶台前', x: 4060, y: 7980 },
  { room: 'kitchen', name: '洗衣机前', x: 4270, y: 4450 },
  { room: 'bath', name: '台盆前', x: -1110, y: 5500 },
  { room: 'bath', name: '淋浴区', x: -2400, y: 4950 },
];

// ───────── 展开为体块（mm，世界坐标；x 向东、y 向南、z 向上），两页的建模与校验共用 ─────────
const bx = (x0, x1, y0, y1, z0, z1, key, extra = {}) => ({ x0, x1, y0, y1, z0, z1, key, ...extra });

// 墙段：窗洞处按窗台高砌到窗台，窗台以上到剖切高度用玻璃；窗台高于剖切面时，在剖切口留一条 WIN_BAND 高的玻璃带示意窗位。
// 每段墙顶加一层深色剖切面（poché），区分「剖到的墙」与客厅满高的墙；wall 为所属墙段序号，校验按它判断重叠
export function wallBoxes() {
  const out = [];
  HOUSE_WALLS.forEach((w, i) => {
    const tag = { wall: i };
    out.push(bx(w.x0, w.x1, w.y0, w.y1, CUT_H, CUT_H + CAP_H, 'wallCut', { ...tag, cap: true }));
    if (!w.win) { out.push(bx(w.x0, w.x1, w.y0, w.y1, 0, CUT_H, 'wallCool', tag)); return; }
    const alongX = w.x1 - w.x0 > w.y1 - w.y0;
    const [a0, a1] = alongX ? [w.x0, w.x1] : [w.y0, w.y1];
    const [f, t, sill] = w.win;
    const seg = (s, e, z0, z1, key, extra = {}) => {
      if (e - s <= 0 || z1 - z0 <= 0) return;
      out.push(alongX ? bx(s, e, w.y0, w.y1, z0, z1, key, { ...tag, ...extra }) : bx(w.x0, w.x1, s, e, z0, z1, key, { ...tag, ...extra }));
    };
    const top = sill < CUT_H ? sill : CUT_H - WIN_BAND;
    seg(a0, f, 0, CUT_H, 'wallCool');
    seg(t, a1, 0, CUT_H, 'wallCool');
    seg(f, t, 0, top, 'wallCool');
    const mid = alongX ? (w.y0 + w.y1) / 2 : (w.x0 + w.x1) / 2; // 玻璃居中，厚 40
    out.push(alongX ? bx(f, t, mid - 20, mid + 20, top, CUT_H, 'glass', { ...tag, glass: true }) : bx(mid - 20, mid + 20, f, t, top, CUT_H, 'glass', { ...tag, glass: true }));
  });
  return out;
}

// 物件形体：体块拆分只做到能读出类型（床头板、座面与靠背、台面），不做门板分缝。
// 按剖切模型截到 CUT_H；整件高于剖切面的物件只画地面投影（ghost，半透明薄片）
export function itemBoxes(it) {
  const z = it.z || 0;
  if (z >= CUT_H) return [bx(it.x, it.x + it.w, it.y, it.y + it.d, 0, GHOST_H, 'overhead', { item: it.name, room: it.room, kind: it.kind, ghost: true })];
  return shapeBoxes(it).map((q) => ({ ...q, z1: Math.min(q.z1, CUT_H) })).filter((q) => q.z1 - q.z0 > 0.5);
}
function shapeBoxes(it) {
  const { x, y, w, d, h } = it, z = it.z || 0, A = it.mat, B = it.mat2 || it.mat;
  const tag = { item: it.name, room: it.room, kind: it.kind };
  const b = (x0, x1, y0, y1, z0, z1, key) => bx(x0, x1, y0, y1, z0, z1, key, tag);
  switch (it.shape) {
    case 'bed': {
      const T = 60;
      const hb = { n: [x, x + w, y, y + T], s: [x, x + w, y + d - T, y + d], e: [x + w - T, x + w, y, y + d], w: [x, x + T, y, y + d] }[it.head];
      const body = { n: [x, x + w, y + T, y + d], s: [x, x + w, y, y + d - T], e: [x, x + w - T, y, y + d], w: [x + T, x + w, y, y + d] }[it.head];
      return [b(...hb, 0, h, A), b(...body, 0, 300, A), b(body[0] + 20, body[1] - 20, body[2] + 20, body[3] - 20, 300, 500, B)];
    }
    case 'chair': {
      const out = [b(x + 20, x + w - 20, y + 20, y + d - 20, 420, 460, A)];
      const back = { n: [x + 20, x + w - 20, y + d - 60, y + d - 20], s: [x + 20, x + w - 20, y + 20, y + 60], e: [x + 20, x + 60, y + 20, y + d - 20], w: [x + w - 60, x + w - 20, y + 20, y + d - 20] }[it.face];
      out.push(b(...back, 460, h, A));
      for (const [lx, ly] of [[x + 30, y + 30], [x + w - 65, y + 30], [x + 30, y + d - 65], [x + w - 65, y + d - 65]]) out.push(b(lx, lx + 35, ly, ly + 35, 0, 420, B));
      return out;
    }
    case 'counter':
      return [b(x, x + w, y, y + d, z, z + h - 30, A), b(x, x + w, y, y + d, z + h - 30, z + h, B)];
    case 'desk':
      return [b(x, x + w, y, y + d, z + h - 30, z + h, A), b(x, x + 30, y, y + d, z, z + h - 30, A), b(x + w - 30, x + w, y, y + d, z, z + h - 30, A)];
    default:
      return [b(x, x + w, y, y + d, z, z + h, A)];
  }
}

// 只有「现状」模型带上一任住户的家具；各方案只保留固定件（新业主的家具未定，放旧家具会误导对比）
export const withPriorFor = (modelKey) => modelKey === 'current';
// replaces：被方案替换掉的固定件，写作「房间/名称」
export const houseItems = (modelKey, replaces = []) => HOUSE_ITEMS.filter((it) => (withPriorFor(modelKey) || it.kind === 'fixed') && !replaces.includes(`${it.room}/${it.name}`));

// 全屋外包框（mm），供俯视取景
export function houseBounds() {
  const xs = [], ys = [];
  for (const w of HOUSE_WALLS) xs.push(w.x0, w.x1), ys.push(w.y0, w.y1);
  for (const [x, y] of ROOM) xs.push(x - WALL_T, x + WALL_T), ys.push(y - WALL_T, y + WALL_T);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
