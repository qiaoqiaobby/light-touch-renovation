// 页面二：全屋创意设计——三个方案在其他房间的构件（单位 mm，坐标同 geometry.js；room 字段标注所属房间）
// 分工三个方案相同：卧室 A 主卧；卧室 B 平时书房 / 和室，「父母来住」时变客房；卧室 C 衣帽间兼储藏；厨卫布局相同，只换材料与一个细部。
// replaces：被方案替换掉的 house.js 固定件（房间/名称）；doors：门型覆盖（sliding 的门不做门扇扫掠检查）。
// 字段含义同 schemes.js；另有 sleeps 床位数（铰链床板只在放平时计入）。全部尺寸为图面读数，待现场复核。

const along = (a0, a1, n, z0, z1) => Array.from({ length: n }, (_, i) => [a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n, z0, z1]);
const inRoom = (room, list) => list.map((p) => ({ room, ...p }));

export const REPLACE_BASE = ['bedA/通顶衣柜', 'bedB/通顶衣柜', 'kitchen/东墙地柜（含水槽）', 'kitchen/南墙地柜（含灶台）', 'kitchen/东墙吊柜', 'bath/台盆柜'];
// 各房间吸顶灯位（夜间点光源，不投影）
export const CEIL_ROOMS = [
  { x: -1700, y: -3500, kind: 'warm', room: 'bedA' }, { x: -3000, y: -300, kind: 'warm', room: 'bedB' }, { x: -1700, y: 3000, kind: 'warm', room: 'bedC' },
  { x: -1500, y: 5300, kind: 'warm', room: 'bath' }, { x: 4300, y: 5600, kind: 'warm', room: 'kitchen' }, { x: 4000, y: 7700, kind: 'warm', room: 'kitchen' },
];
export const ROLES = { bedA: '主卧', bedB: '书房 / 父母来住时的客房', bedC: '衣帽间兼储藏', bath: '卫生间', kitchen: '厨房' };

export function buildRooms(stateKeys) {
  const NOT_GUESTS = stateKeys.filter((k) => k !== 'guests');

  // 三个方案共用几何、只换材料的构件
  const wardrobeA = (pre, mat) => ({ id: `${pre}Wardrobe`, name: '衣柜（原柜体换门板）', shape: 'cabinet', x: -3460, y: -4050, w: 600, d: 2400, h: 2400, mat, mat2: 'walnutIn',
    access: { side: 'e', depth: 450 }, facade: { face: 'e', toe: 60, doors: along(-4050, -1650, 4, 60, 2400) } });
  const wardrobeB = (pre, mat) => ({ id: `${pre}WardrobeB`, name: '衣柜（原柜体换门板）', shape: 'cabinet', x: -4790, y: 1350, w: 1680, d: 600, h: 2400, mat, mat2: 'walnutIn',
    access: { side: 'n', depth: 450 }, facade: { face: 'n', toe: 60, doors: along(-4790, -3110, 3, 60, 2400) } });
  const sillA = (pre, mat, h = 80) => ({ id: `${pre}SillA`, name: '窗龛坐垫', shape: 'cushion', x: -2950, y: -6180, w: 2270, d: 680, h, z: 450, mat, mount: 'on' });
  const bayB = (pre, mat, h = 80) => ({ id: `${pre}BayB`, name: '转角飘窗坐垫', shape: 'cushion', x: -5560, y: -2020, w: 720, d: 1170, h, z: 450, mat, mount: 'on' });
  const deskChair = (pre) => ({ id: `${pre}Chair`, name: '书桌椅', shape: 'chair', carried: true, x: -4500, y: -1500, w: 450, d: 450, h: 800, face: 'n', mat: 'oakPale', mat2: 'steelBlack', only: NOT_GUESTS });
  const zaisu = (id, x, face) => ({ id, name: '带靠背地面座椅', shape: 'zaisu', carried: true, x, y: -440, w: 400, d: 400, h: 450, z: 300, face, mat: 'linenSand', mat2: 'hinoki', mount: 'deck', only: NOT_GUESTS });

  // 厨房：保持 L 形；北段洗衣机位（燃气热水器在其上方，不做叠放）与储物高柜，门旁嵌烤箱的高柜，吊柜下灯带
  const kitchen = (pre, door, top) => inRoom('kitchen', [
    { id: `${pre}KE`, name: '东墙地柜', shape: 'cabinet', x: 4540, y: 5400, w: 600, d: 3450, h: 820, mat: door, mat2: 'walnutIn', facade: { face: 'w', toe: 80, doors: along(5400, 8850, 6, 80, 820) } },
    { id: `${pre}KTopE`, name: '东墙台面', shape: 'slab', x: 4540, y: 5400, w: 600, d: 3450, h: 30, z: 820, mat: top, mount: 'on' },
    { id: `${pre}KS`, name: '南墙地柜', shape: 'cabinet', x: 3390, y: 8250, w: 1150, d: 600, h: 820, mat: door, mat2: 'walnutIn', facade: { face: 'n', toe: 80, doors: along(3390, 4540, 2, 80, 820) } },
    { id: `${pre}KTopS`, name: '南墙台面', shape: 'slab', x: 3390, y: 8250, w: 1150, d: 600, h: 30, z: 820, mat: top, mount: 'on' },
    { id: `${pre}KUp`, name: '东墙吊柜（到 2.4 m）', shape: 'cabinet', x: 4790, y: 5400, w: 350, d: 3450, h: 900, z: 1500, mat: door, mat2: 'walnutIn', mount: 'wall', facade: { face: 'w', doors: along(5400, 8850, 6, 1500, 2400) } },
    { id: `${pre}KLed`, name: '吊柜下灯带', shape: 'led', x: 4800, y: 5420, w: 30, d: 3410, h: 10, z: 1488, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
    { id: `${pre}KPantry`, name: '储物高柜', shape: 'cabinet', x: 4540, y: 4800, w: 600, d: 600, h: 2400, mat: door, mat2: 'walnutIn', facade: { face: 'w', toe: 80, doors: [[4800, 5400, 80, 2400]] } },
    { id: `${pre}KWasher`, name: '洗衣机（新）', shape: 'box', x: 4540, y: 4150, w: 600, d: 600, h: 850, mat: 'plasticWhite' },
    { id: `${pre}KOven`, name: '嵌入烤箱与微波炉的高柜', shape: 'cabinet', x: 2990, y: 7590, w: 600, d: 600, h: 2400, mat: door, mat2: 'walnutIn',
      facade: { face: 'e', toe: 80, doors: [[7590, 8190, 80, 700], [7590, 8190, 1600, 2400]], recesses: [{ a: [7610, 8170], z: [700, 1600], depth: 560, shelves: 2 }] } },
  ]);
  const bath = (pre, list) => inRoom('bath', list.map((p) => ({ ...p, id: `${pre}${p.id}` })));

  // ───── 方案四「墙」：功能退进墙体 ─────
  const s4 = [
    ...inRoom('bedA', [
      { id: 'a4Panel', name: '床头护墙板（含灯槽与壁龛）', shape: 'cabinet', x: -270, y: -5350, w: 100, d: 3700, h: 2400, mat: 'oakPale', mat2: 'walnutIn', mount: 'wall',
        facade: { face: 'w', recesses: [{ a: [-4400, -2700], z: [950, 1150], depth: 60 }, { a: [-4950, -4550], z: [550, 900], depth: 80 }, { a: [-2550, -2150], z: [550, 900], depth: 80 }] } },
      { id: 'a4Led', name: '床头灯槽', host: 'a4Panel', shape: 'led', x: -265, y: -4400, w: 50, d: 1700, h: 10, z: 1135, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
      { id: 'a4Bed', name: '双人床 1800', shape: 'daybed', face: 'w', x: -2270, y: -4450, w: 2000, d: 1800, h: 300, mat: 'oakPale', mat2: 'linenSand', sleeps: 2 },
      wardrobeA('a4', 'oakPale'),
      { id: 'a4Partner', name: '伴侣衣柜（门廊）', shape: 'cabinet', x: -1370, y: -1650, w: 550, d: 780, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
        access: { side: 'e', depth: 450 }, facade: { face: 'e', toe: 60, doors: along(-1650, -870, 2, 60, 2400) } },
      sillA('a4', 'linenSand'),
    ]),
    ...inRoom('bedB', [
      { id: 'b4Cab', name: '竖翻壁床柜', shape: 'cabinet', x: -3700, y: -1530, w: 1600, d: 350, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
        facade: { face: 's', recesses: [{ a: [-3660, -2140], z: [280, 2380], depth: 330 }] } },
      // 床板绕柜前下沿（y −1180、离地 300）转动：竖起时收在柜内，放平时床面高 550
      { id: 'b4Bed', name: '壁床（1500 × 2000）', host: 'b4Cab', kind: 'hinge', shape: 'bedpanel', axis: 'x', pivot: { y: -1180, z: 300 }, span: [-3650, -2150], len: 2000, thick: 250, dir: 1,
        angle: 90, states: { guests: { angle: 0 } }, mat: 'oakPale', mat2: 'bedding', sleeps: 2 },
      { id: 'b4LegL', name: '床尾支腿', shape: 'box', x: -3610, y: 770, w: 40, d: 40, h: 300, mat: 'steelBlack', only: ['guests'] },
      { id: 'b4LegR', name: '床尾支腿', shape: 'box', x: -2230, y: 770, w: 40, d: 40, h: 300, mat: 'steelBlack', only: ['guests'] },
      { id: 'b4Desk', name: '窗下书桌', shape: 'slab', x: -4790, y: -2070, w: 1050, d: 520, h: 30, z: 720, mat: 'oakPale', mount: 'wall' },
      { id: 'b4Shelf', name: '西墙书架（顶在空调下 200）', shape: 'shelf', x: -4790, y: -700, w: 250, d: 1500, h: 1000, z: 1000, mat: 'oakPale', mount: 'wall' },
      deskChair('b4'),
      wardrobeB('b4', 'oakPale'),
      bayB('b4', 'linenSand'),
    ]),
    ...inRoom('bedC', [
      { id: 'c4North', name: '北墙衣柜', shape: 'cabinet', x: -2980, y: 1660, w: 1740, d: 600, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
        access: { side: 's', depth: 450 }, facade: { face: 's', toe: 60, doors: along(-2980, -1240, 3, 60, 2400) } },
      { id: 'c4East', name: '东墙衣柜', shape: 'cabinet', x: -720, y: 2600, w: 600, d: 1100, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
        access: { side: 'w', depth: 450 }, facade: { face: 'w', toe: 60, doors: along(2600, 3700, 2, 60, 2400) } },
      { id: 'c4Bench', name: '窗下抽屉矮柜（行李台）', shape: 'cabinet', x: -2980, y: 2750, w: 450, d: 950, h: 450, mat: 'oakPale', mat2: 'walnutIn',
        access: { side: 'e', depth: 400 }, facade: { face: 'e', toe: 60, doors: along(2750, 3700, 2, 60, 450) } },
    ]),
    ...kitchen('k4', 'oakPale', 'whiteTop'),
    ...bath('x4', [
      { id: 'Vanity', name: '悬挂台盆柜', shape: 'cabinet', x: -1500, y: 5770, w: 780, d: 500, h: 520, z: 300, mat: 'oakPale', mat2: 'walnutIn', mount: 'wall', facade: { face: 'n', doors: along(-1500, -720, 2, 300, 820) } },
      { id: 'Basin', name: '台盆', shape: 'slab', x: -1500, y: 5770, w: 780, d: 500, h: 30, z: 820, mat: 'ceramic', mount: 'on' },
      { id: 'Mirror', name: '到顶镜柜', shape: 'cabinet', x: -1500, y: 6120, w: 780, d: 150, h: 1250, z: 1150, mat: 'oakPale', mat2: 'walnutIn', mount: 'wall', facade: { face: 'n', doors: along(-1500, -720, 2, 1150, 2400) } },
    ]),
  ];

  // ───── 方案五「台」：高差代替家具 ─────
  const s5 = [
    ...inRoom('bedA', [
      { id: 'a5Deck', name: '蔺草地台床座', shape: 'deck', x: -2370, y: -4950, w: 2200, d: 2800, h: 300, z: 0, mat: 'tatami', mat2: 'hinoki', deck: true },
      { id: 'a5Mattress', name: '床垫 1800', shape: 'cushion', x: -2270, y: -4450, w: 2000, d: 1800, h: 200, z: 300, mat: 'linenSand', mount: 'deck', sleeps: 2 },
      { id: 'a5Head', name: '亚麻软靠', shape: 'cushion', x: -270, y: -4450, w: 100, d: 1800, h: 500, z: 300, mat: 'linenSand', mount: 'wall' },
      wardrobeA('a5', 'hinoki'),
      sillA('a5', 'tatami', 15),
    ]),
    ...inRoom('bedB', [
      { id: 'b5Deck', name: '和室地台', shape: 'deck', x: -4790, y: -1530, w: 2390, d: 2380, h: 300, z: 0, mat: 'tatami', mat2: 'hinoki', deck: true },
      { id: 'b5Deck2', name: '和室地台（窗下）', shape: 'deck', x: -4790, y: -2070, w: 1190, d: 540, h: 300, z: 0, mat: 'tatami', mat2: 'hinoki', deck: true },
      // 桌板平时升到台面上 330（坐垫上读书喝茶），父母来住时降到与台面齐平，成为铺被褥的地面
      { id: 'b5Table', name: '升降和室桌', host: 'b5Deck', shape: 'slab', x: -4050, y: -840, w: 900, d: 1200, h: 30, z: 600, mat: 'hinoki', mount: 'deck',
        states: { guests: { z: 270, cover: true } } },
      { id: 'b5Col', name: '升降立柱', host: 'b5Deck', shape: 'box', x: -3640, y: -280, w: 80, d: 80, h: 600, z: 0, mat: 'steelBlack', mount: 'deck', states: { guests: { h: 270 } } },
      zaisu('b5z1', -4500, 'e'),
      zaisu('b5z2', -3100, 'w'),
      { id: 'b5Futon1', name: '被褥（1000 × 2000）', shape: 'cushion', carried: true, x: -4600, y: -1480, w: 2000, d: 1000, h: 80, z: 300, mat: 'bedding', mount: 'deck', soft: true, sleeps: 1, only: ['guests'] },
      { id: 'b5Futon2', name: '被褥（1000 × 2000）', shape: 'cushion', carried: true, x: -4600, y: -380, w: 2000, d: 1000, h: 80, z: 300, mat: 'bedding', mount: 'deck', soft: true, sleeps: 1, only: ['guests'] },
      wardrobeB('b5', 'hinoki'),
      bayB('b5', 'tatami', 15),
    ]),
    ...inRoom('bedC', [
      { id: 'c5North', name: '北墙开放挂衣', shape: 'cabinet', x: -2980, y: 1660, w: 1740, d: 600, h: 2400, mat: 'hinoki', mat2: 'walnutIn',
        facade: { face: 's', recesses: [{ a: [-2960, -1260], z: [200, 2300], depth: 560 }] } },
      { id: 'c5Curtain', name: '亚麻帘', shape: 'curtain', x: -2960, y: 2270, w: 1700, d: 30, h: 2200, z: 100, mat: 'linenSand', soft: true },
      { id: 'c5Deck', name: '窗下储物台（深抽屉）', shape: 'deck', x: -2980, y: 2750, w: 800, d: 950, h: 400, z: 0, mat: 'tatami', mat2: 'hinoki', deck: true, access: { side: 'e', depth: 450 } },
      { id: 'c5Hang', name: '原书桌位改开放挂衣', shape: 'cabinet', x: -1780, y: 3750, w: 1200, d: 600, h: 2000, mat: 'hinoki', mat2: 'walnutIn',
        facade: { face: 'n', recesses: [{ a: [-1760, -600], z: [100, 1980], depth: 560 }] } },
    ]),
    ...kitchen('k5', 'hinoki', 'counterStone'),
    ...bath('x5', [
      { id: 'Vanity', name: '落地台盆柜', shape: 'cabinet', x: -1500, y: 5770, w: 780, d: 500, h: 820, mat: 'hinoki', mat2: 'walnutIn', facade: { face: 'n', toe: 80, doors: along(-1500, -720, 2, 80, 820) } },
      { id: 'Top', name: '石材台面', shape: 'slab', x: -1500, y: 5770, w: 780, d: 500, h: 30, z: 820, mat: 'counterStone', mount: 'on' },
      { id: 'Slat', name: '淋浴区桧木格栅踏板', shape: 'slab', x: -2860, y: 4500, w: 920, d: 940, h: 40, z: 20, mat: 'hinoki', mount: 'on' },
      { id: 'Mirror', name: '镜子', shape: 'slab', x: -1450, y: 6250, w: 680, d: 20, h: 800, z: 1150, mat: 'steel', mount: 'wall' },
    ]),
  ];

  // ───── 方案六「动」：边界可以移动 ─────
  const s6 = [
    ...inRoom('bedA', [
      { id: 'a6Bed', name: '双人床 1800', shape: 'daybed', face: 'w', x: -2170, y: -4450, w: 2000, d: 1800, h: 300, mat: 'oakPale', mat2: 'linenStone', sleeps: 2 },
      { id: 'a6Side1', name: '带轮边几', shape: 'box', x: -570, y: -4950, w: 400, d: 400, h: 500, mat: 'yakisugi' },
      { id: 'a6Side2', name: '带轮边几', shape: 'box', x: -570, y: -2550, w: 400, d: 400, h: 500, mat: 'yakisugi' },
      { id: 'a6Curtain', name: '门廊天花轨道亚麻帘（收在一侧）', shape: 'curtain', x: -470, y: -1720, w: 300, d: 40, h: 2300, z: 20, mat: 'linenStone', soft: true },
      wardrobeA('a6', 'yakisugi'),
      sillA('a6', 'linenStone'),
    ]),
    ...inRoom('bedB', [
      { id: 'b6Sofa', name: '低矮沙发床', shape: 'sofa', face: 's', x: -3800, y: -1530, w: 2000, d: 900, h: 700, mat: 'linenStone', mat2: 'linenStone' },
      // 床架平时收在座下，父母来住时沿轨道拉出 1100；床垫由沙发靠垫与收纳的床垫铺成
      { id: 'b6Pull', name: '拉出床架', host: 'b6Sofa', shape: 'box', x: -3650, y: -1230, w: 1500, d: 500, h: 300, z: 80, mat: 'oakPale', mount: 'stowed',
        states: { guests: { y: -630, d: 1100, mount: 'floor' } } },
      { id: 'b6Mat', name: '床垫（1500 × 1800）', host: 'b6Sofa', shape: 'cushion', carried: true, x: -3650, y: -1330, w: 1500, d: 1800, h: 120, z: 380, mat: 'bedding', soft: true, sleeps: 2, only: ['guests'] },
      { id: 'b6Desk', name: '带锁定脚轮的书桌', shape: 'table', x: -4790, y: -2070, w: 1000, d: 520, h: 750, mat: 'oakPale', mat2: 'steelBlack' },
      deskChair('b6'),
      wardrobeB('b6', 'yakisugi'),
      bayB('b6', 'linenStone'),
    ]),
    ...inRoom('bedC', [
      { id: 'c6North', name: '北墙衣柜', shape: 'cabinet', x: -2980, y: 1660, w: 1740, d: 600, h: 2400, mat: 'yakisugi', mat2: 'walnutIn',
        access: { side: 's', depth: 450 }, facade: { face: 's', toe: 60, doors: along(-2980, -1240, 3, 60, 2400) } },
      { id: 'c6Island', name: '带轮更衣岛（台面折衣）', shape: 'ottoman', x: -2300, y: 2850, w: 800, d: 500, h: 900, mat: 'yakisugi', mat2: 'oakPale' },
    ]),
    ...kitchen('k6', 'steelBlack', 'oakPale'),
    ...bath('x6', [
      { id: 'Vanity', name: '烧杉台盆柜', shape: 'cabinet', x: -1500, y: 5770, w: 780, d: 500, h: 820, mat: 'yakisugi', mat2: 'walnutIn', facade: { face: 'n', toe: 80, doors: along(-1500, -720, 2, 80, 820) } },
      { id: 'Top', name: '木台面', shape: 'slab', x: -1500, y: 5770, w: 780, d: 500, h: 30, z: 820, mat: 'oakPale', mount: 'on' },
      { id: 'Mirror', name: '圆镜', shape: 'slab', x: -1410, y: 6250, w: 600, d: 20, h: 600, z: 1200, mat: 'steel', mount: 'wall' },
    ]),
  ];
  return { s4, s5, s6 };
}

// 面板「全屋」一节：房间角色与改动清单（层级、可逆性、依据）
const KITCHEN = { level: 'L3', text: '保持 L 形：换柜门与台面，北段储物高柜，门旁嵌烤箱高柜，吊柜下灯带；洗衣机位保留（燃气热水器在其上方，不做洗烘叠放）', rev: '较难逆转', basis: '#21、#22、#25、#3' };
const SQUAT = { level: 'L4', text: '蹲便改坐便需处理下沉并加装移位器，须专业人员评估；模型保留蹲便', rev: '基本不可逆', basis: '水电点位保留' };
export const ROOM_META = {
  s4: {
    replaces: REPLACE_BASE,
    doors: { bedB: 'sliding' },
    guests: { list: ['拉开卧室 B 推拉门', '解锁壁床，向下翻放', '翻出床尾支腿'], sec: 30 },
    rooms: [
      { room: 'bedA', changes: [
        { level: 'L3', text: '东墙 100 厚浅橡木护墙板，床头灯槽与两侧壁龛代替床头柜', rev: '较难逆转', basis: '#3、#22' },
        { level: 'L3', text: '门廊西侧伴侣衣柜 550 × 780，让开门扇扫掠范围，门廊留 550 通道', rev: '较难逆转', basis: '伴侣同住；#25' },
        { level: 'L2', text: '原衣柜换无把手浅橡木门板；窗龛坐垫', rev: '部分可逆', basis: '#12、#22' }] },
      { room: 'bedB', changes: [
        { level: 'L3', text: '北墙竖翻壁床柜 1600 × 350 × 2400，内收 1500 × 2000 床，床面高 550', rev: '较难逆转', basis: '#9：客房平时有用' },
        { level: 'L3', text: '门改室内侧明装推拉门（原门扇会撞到放下的床）', rev: '较难逆转', basis: '#13' },
        { level: 'L2', text: '窗下书桌、西墙书架（顶在挂机空调下 200）；衣柜换门板', rev: '部分可逆', basis: '#16、#22' }] },
      { room: 'bedC', changes: [
        { level: 'L3', text: '北墙、东墙到顶衣柜，窗下抽屉矮柜兼行李台；原一体柜保留', rev: '较难逆转', basis: '#23、#25' }] },
      { room: 'kitchen', changes: [KITCHEN, { level: 'L2', text: '浅橡木平板门、浅色台面，吊柜到 2.4 m', rev: '部分可逆', basis: '#21' }] },
      { room: 'bath', changes: [{ level: 'L2', text: '浅橡木悬挂台盆柜与到顶镜柜', rev: '部分可逆', basis: '#23、#24' }, SQUAT] },
    ],
  },
  s5: {
    replaces: [...REPLACE_BASE, 'bedC/一体柜：书桌', 'bedC/一体柜：开放书架'],
    doors: {},
    guests: { list: ['收起坐垫', '按键把和室桌降到与台面齐平', '从衣柜取出两床被褥铺开'], sec: 90 },
    rooms: [
      { room: 'bedA', changes: [
        { level: 'L3', text: '300 高桧木框蔺草地台床座，南北各伸出 500 作床头台面', rev: '较难逆转', basis: '与客厅地台同一语言；#16' },
        { level: 'L2', text: '原衣柜换桧木色门板；窗龛铺蔺草席', rev: '部分可逆', basis: '#12、#22' }] },
      { room: 'bedB', changes: [
        { level: 'L3', text: '西半间 300 高和室地台，东、南两侧留土间，门扇扫掠范围内无台面', rev: '较难逆转', basis: '#9、#13' },
        { level: 'L3', text: '升降和室桌 900 × 1200：平时升起读书喝茶，父母来住时降平、铺两床被褥', rev: '较难逆转', basis: '客房平时有用' },
        { level: 'L2', text: '被褥收在原衣柜，衣柜换桧木色门板', rev: '部分可逆', basis: '#25' }] },
      { room: 'bedC', changes: [
        { level: 'L3', text: '北墙开放挂衣加亚麻帘；窗下 400 高储物台；原书桌位改开放挂衣', rev: '较难逆转', basis: '#25' }] },
      { room: 'kitchen', changes: [KITCHEN, { level: 'L2', text: '桧木色柜门、石材台面', rev: '部分可逆', basis: '#21' }] },
      { room: 'bath', changes: [{ level: 'L1', text: '淋浴区桧木格栅踏板', rev: '可逆', basis: '脚感与防滑' }, { level: 'L2', text: '落地台盆柜配石材台面', rev: '部分可逆', basis: '#23' }, SQUAT] },
    ],
  },
  s6: {
    replaces: REPLACE_BASE,
    doors: {},
    guests: { list: ['取下沙发靠垫', '沿轨道拉出床架', '铺开床垫'], sec: 45 },
    rooms: [
      { room: 'bedA', changes: [
        { level: 'L1', text: '1800 低床、两只带轮边几；门廊天花轨道亚麻帘，作息不同时拉上', rev: '可逆', basis: '伴侣同住；#7' },
        { level: 'L2', text: '原衣柜换烧杉色门板', rev: '部分可逆', basis: '#22' }] },
      { room: 'bedB', changes: [
        { level: 'L1', text: '北墙低矮沙发床：床架沿轨道拉出 1100，睡面 1500 × 1800；偏西放置，原门保留', rev: '可逆', basis: '#9、#13' },
        { level: 'L1', text: '窗下带锁定脚轮的书桌', rev: '可逆', basis: '#16' },
        { level: 'L2', text: '衣柜换烧杉色门板', rev: '部分可逆', basis: '#22' }] },
      { room: 'bedC', changes: [
        { level: 'L3', text: '北墙烧杉色衣柜', rev: '较难逆转', basis: '#25' },
        { level: 'L1', text: '带轮更衣岛 800 × 500 × 900，台面折衣', rev: '可逆', basis: '#23' }] },
      { room: 'kitchen', changes: [KITCHEN, { level: 'L2', text: '炭黑金属柜门配木台面', rev: '部分可逆', basis: '#21' }] },
      { room: 'bath', changes: [{ level: 'L2', text: '烧杉台盆柜、木台面与圆镜', rev: '部分可逆', basis: '#23' }, SQUAT] },
    ],
  },
};
