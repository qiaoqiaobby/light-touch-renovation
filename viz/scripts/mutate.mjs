// 变异测试（npm run mutate）。逐项人为制造违规，确认「对应的那项检查」能报错；每项结束后恢复原文件
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILE = 'viz/src/creative/schemes.js';
const RIG = 'viz/src/creative/rig.js';
const HOUSE = 'viz/src/house.js';
const ROOMS = 'viz/src/creative/rooms.js';
const originals = { [FILE]: readFileSync(FILE, 'utf8'), [RIG]: readFileSync(RIG, 'utf8'), [HOUSE]: readFileSync(HOUSE, 'utf8'), [ROOMS]: readFileSync(ROOMS, 'utf8') };
// expect：必须出现的 FAIL 行里同时包含的方案名与检查名
const MUTATIONS = [
  { name: '翻板撞到坐榻柜（方案四餐桌翻板铰链范围北移）', from: 'pivot: { x: 3040, z: 710 }, span: [4668, 5532]', to: 'pivot: { x: 3040, z: 710 }, span: [4200, 5064]', expect: ['方案四', '实体互不重叠'] },
  { name: '踏步挡住西侧通道（方案五踏步抽到 x 200）', from: "states: { party: { y: 4200, mount: 'floor' } } },", to: "states: { party: { x: 200, y: 4300, mount: 'floor' } } },", expect: ['方案五', '主路线'] },
  { name: '体块停在非定位点（方案六 P2 由 2600 改为 2900）', from: 'const P2 = { y: 2600 };', to: 'const P2 = { y: 2900 };', expect: ['方案六', '停在定位点'] },
  { name: '体块行程上放一盏落地灯（只有扫掠检查能发现）', from: "    { id: 'sofa', name: '低矮模块沙发'", to: "    { id: 'probe', name: '变异测试落地灯', shape: 'box', x: 2900, y: 3400, w: 150, d: 150, h: 1500, mat: 'charcoal' },\n    { id: 'sofa', name: '低矮模块沙发'", expect: ['方案六', '扫掠'] },
  { name: '聚会椅子挡住椅柜门（方案四 c6 东移到 x 2560）', from: "chair('c6', ['party'], { base: { x: 1990, y: 5550, face: 'n' } })", to: "chair('c6', ['party'], { base: { x: 2560, y: 5550, face: 'n' } })", expect: ['方案四', '门前净空'] },
  { name: '运动区缩到放不下瑜伽垫（方案六运动区 1500 × 900）', from: 'exerciseZone: { x: 1100, y: 2050, w: 2200, d: 2150 },', to: 'exerciseZone: { x: 1100, y: 2050, w: 1500, d: 900 },', expect: ['方案六', '运动区'] },
  // 复审在副本上发现「改回原样仍能通过」的 5 项修复，以及桌板豁免漏洞
  { name: '去掉「先收后推」路由', file: RIG, from: "if (openFollower) return [[A, 'daily'], ['daily', B]];", to: '', expect: ['方案六', '推动体块时翻板已收起'] },
  { name: '上翻门铰链改回门板内侧', from: 'pivot: { x: 3000, z: 2300 }, span: [3303, 3597], len: 400, thick: 18, dir: -1, side: -1,', to: 'pivot: { x: 3020, z: 2300 }, span: [3303, 3597], len: 400, thick: 18, dir: -1,', expect: ['方案四', '门板'] },
  { name: '餐桌翻板改回 900 宽（穿端板）', from: 'pivot: { x: 3040, z: 710 }, span: [4668, 5532]', to: 'pivot: { x: 3040, z: 710 }, span: [4650, 5550]', expect: ['方案四', '端板'] },
  { name: '方案六椅仓深度改回 180', from: "shape: 'chairstack', x: 1975, y: 4205, w: 450, d: 270", to: "shape: 'chairstack', x: 1975, y: 4205, w: 450, d: 180", expect: ['方案六', '椅仓容量'] },
  { name: '坐榻龛顶灯带压到 z 1300', from: "z: 1435, mat: 'ledStrip'", to: "z: 1300, mat: 'ledStrip'", expect: ['方案四', '坐姿净高'] },
  { name: '升降立柱收起时顶穿桌板（桌板豁免漏洞）', from: 'x: 2250, y: 1750, w: 100, d: 100, h: 370', to: 'x: 2250, y: 1750, w: 100, d: 100, h: 400', expect: ['方案五', '实体互不重叠'] },
  { name: '聚会少一把椅子（方案四 c6 只在双人餐出现）', from: "chair('c6', ['party'], { base: { x: 1990, y: 5550, face: 'n' } })", to: "chair('c6', ['dine2'], { base: { x: 1990, y: 5550, face: 'n' } })", expect: ['方案四', '多人聚会餐座'] },
  // 全屋外壳（house.js）
  { name: '卧室 A 的床移出房间', file: HOUSE, from: "shape: 'bed', head: 'n', x: -2560,", to: "shape: 'bed', head: 'n', x: -3700,", expect: ['卧室 A', '物件在房间内'] },
  { name: '卧室 B 衣柜压到床上', file: HOUSE, from: "name: '通顶衣柜', shape: 'box', x: -4790, y: 1350,", to: "name: '通顶衣柜', shape: 'box', x: -4790, y: -500,", expect: ['卧室 B', '物件互不重叠'] },
  { name: '台盆柜挡住卫生间开口', file: HOUSE, from: "name: '台盆柜', shape: 'counter', x: -1500,", to: "name: '台盆柜', shape: 'counter', x: -1300,", expect: ['卫生间开口', '门内 600 净空'] },
  { name: '方案模型混入上一任住户家具', file: HOUSE, from: "export const withPriorFor = (modelKey) => modelKey === 'current';", to: 'export const withPriorFor = () => true;', expect: ['方案四', '方案不含上一任住户家具'] },
  { name: '卧室 C 东墙读错 520 mm（侵入客厅）', file: HOUSE, from: "poly: [[-2980, 1660], [-120, 1660], [-120, 4350], [-2980, 4350]] },", to: "poly: [[-2980, 1660], [400, 1660], [400, 4350], [-2980, 4350]] },", expect: ['外壳', '房间轮廓互不重叠'] },
  // 外壳审查发现的空检
  { name: '卧室 A 北墙重复一行且漏写窗', file: HOUSE, from: "{ x0: -3000, x1: -630, y0: -6400, y1: -6230, win: [-2900, -730, 450] },", to: "{ x0: -3000, x1: -630, y0: -6400, y1: -6230, win: [-2900, -730, 450] }, { x0: -3000, x1: -630, y0: -6400, y1: -6230 },", expect: ['外壳', '墙段互不重叠'] },
  { name: '删掉厨房东墙', file: HOUSE, from: "  { x0: 5140, x1: 5390, y0: 4130, y1: 9100 },", to: '', expect: ['外壳', '房间四周封闭'] },
  { name: '卫生间南墙缩短 600 留缝', file: HOUSE, from: '{ x0: -3110, x1: -670, y0: 6270, y1: 6510 },', to: '{ x0: -2510, x1: -670, y0: 6270, y1: 6510 },', expect: ['外壳', '房间四周封闭'] },
  { name: '卧室 B 门前净空矩形挪到房间另一头', file: HOUSE, from: "name: '卧室 B 门', x: -2110, y: 280,", to: "name: '卧室 B 门', x: -4200, y: 280,", expect: ['卧室 B 门', '门内 600 净空'] },
  { name: '卫生间轮廓伸进客厅墙（东南角不让开）', file: HOUSE, from: '[-120, 6150], [-670, 6150], [-670, 6270], [-2880, 6270]] },', to: '[-120, 6270], [-2880, 6270]] },', expect: ['外壳', '墙体不侵入房间'] },
  // 全屋创意设计（rooms.js）
  { name: '书桌伸进壁床翻转范围（只有扫掠能发现）', file: ROOMS, from: "{ id: 'b4Desk', name: '窗下书桌', shape: 'slab', x: -4790, y: -2070, w: 1050,", to: "{ id: 'b4Desk', name: '窗下书桌', shape: 'slab', x: -4790, y: -1100, w: 1300,", expect: ['方案四', '扫掠'] },
  { name: '方案四卧室 B 改回平开门', file: ROOMS, from: "doors: { bedB: 'sliding' },", to: 'doors: {},', expect: ['方案四', '卧室 B 门门扇扫掠'] },
  { name: '和室地台伸进门扇扫掠范围', file: ROOMS, from: "{ id: 'b5Deck', name: '和室地台', shape: 'deck', x: -4790, y: -1530, w: 2390,", to: "{ id: 'b5Deck', name: '和室地台', shape: 'deck', x: -4790, y: -1530, w: 2700,", expect: ['方案五', '卧室 B 门门扇扫掠'] },
  { name: '沙发床拉出越界', file: ROOMS, from: "states: { guests: { y: -630, d: 1200, mount: 'floor' } } },", to: "states: { guests: { y: -630, d: 2900, mount: 'floor' } } },", expect: ['方案六', '构件在房间内'] },
  { name: '父母来住少一床被褥', file: ROOMS, from: "x: -4600, y: -380, w: 2000, d: 1000, h: 80, z: 300, mat: 'bedding', mount: 'deck', soft: true, sleeps: 1, only: ['guests'] },", to: "x: -4600, y: -380, w: 2000, d: 1000, h: 80, z: 300, mat: 'bedding', mount: 'deck', soft: true, sleeps: 1, only: ['movie'] },", expect: ['方案五', '父母来住床位'] },
  { name: '衣帽间衣柜挡门', file: ROOMS, from: "{ id: 'c4North', name: '北墙衣柜', shape: 'cabinet', x: -2980, y: 1660, w: 1740,", to: "{ id: 'c4North', name: '北墙衣柜', shape: 'cabinet', x: -2980, y: 1660, w: 2200,", expect: ['方案四', '卧室 C 门内 600 净空'] },
  { name: '替换件名称拼错（旧台盆柜与新台盆柜叠在一起）', file: ROOMS, from: "'kitchen/东墙吊柜', 'bath/台盆柜'];", to: "'kitchen/东墙吊柜', 'bath/台盆'];", expect: ['全屋', '替换的固定件都存在'] },
  { name: '伴侣衣柜加深到 650，门廊过不去', file: ROOMS, from: "{ id: 'a4Partner', name: '伴侣衣柜（门廊）', shape: 'cabinet', x: -1370, y: -1650, w: 550,", to: "{ id: 'a4Partner', name: '伴侣衣柜（门廊）', shape: 'cabinet', x: -1370, y: -1650, w: 650,", expect: ['方案四', '可达'] },
  // 全屋设计审查（2026-09-30）补的守护
  { name: '卧室 B 衣柜改回 3 扇 560 宽门（方案五地台前开不到 90°）', file: ROOMS, from: 'doors: along(-4790, -3110, 4, 60, 2400)', to: 'doors: along(-4790, -3110, 3, 60, 2400)', expect: ['方案五', '柜门扇宽'] },
  { name: '南墙地柜门板改回从 x 3390 起（首扇被烤箱高柜挡）', file: ROOMS, from: 'doors: along(3590, 4540, 2, 80, 820)', to: 'doors: along(3390, 4540, 2, 80, 820)', expect: ['厨房', '柜门扇宽'] },
  { name: '伴侣衣柜改回深 780（门轴在另一端时被门扇扫到）', file: ROOMS, from: "y: -1650, w: 550, d: 690,", to: "y: -1650, w: 550, d: 780,", expect: ['方案四', '门轴在另一端'] },
  { name: '卧室 B 衣柜前放一只箱子', file: ROOMS, from: "      deskChair('b6', -4550),", to: "      deskChair('b6', -4550),\n      { id: 'probeB', name: '变异测试箱', shape: 'box', x: -4790, y: 850, w: 1680, d: 300, h: 600, mat: 'oakPale' },", expect: ['方案六', '衣柜前'] },
];

let caught = 0;
try {
  for (const m of MUTATIONS) {
    const file = m.file || FILE, original = originals[file];
    if (original.split(m.from).length !== 2) throw new Error(`定位串不唯一或不存在：${m.from.slice(0, 60)}`);
    writeFileSync(file, original.replace(m.from, m.to));
    let out = '';
    try { out = execSync('node viz/scripts/validate.mjs', { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { out = e.stdout; }
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL') && m.expect.every((k) => l.includes(k)));
    console.log(`${fails.length ? '已捕获' : '未捕获'}  ${m.name}`);
    for (const f of fails.slice(0, 2)) console.log(`    ${f.slice(0, 150)}`);
    if (fails.length) caught++;
    writeFileSync(file, original);
  }
} finally {
  for (const [f, text] of Object.entries(originals)) writeFileSync(f, text);
}
console.log(`\n变异 ${MUTATIONS.length} 项：由对应检查捕获 ${caught}，漏检 ${MUTATIONS.length - caught}；原文件已恢复`);
