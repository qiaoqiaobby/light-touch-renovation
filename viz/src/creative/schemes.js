// 页面二：现状与创意三方案（墙 / 台 / 动）的构件数据（单位 mm，坐标同 geometry.js）
// 构件字段见 rig.js；另有：shape 绘制方式，mat/mat2 材质，face 座位朝向，cover 地面覆盖物或与台面齐平的盖板，
// occupied 运动时被占用，deck 地台面（可站立、可运动），seat 餐座数，access 门前净空，light 夜间光源（1 点光源，'area' 面光源），
// host 所属柜体（与宿主之间不算冲突），dock 可移动体块的定位点，wallEdge 贴在哪面墙上（该墙被剖切隐藏时一并隐藏）
// facade（shape 'cabinet'）：doors 为门板 [a0, a1, z0, z1]（一律为平开门，门扇宽即开启所需的门前净深），recesses 为凹槽 { face, a: [a0, a1], z: [z0, z1], depth, shelves }，
// face 为正面朝向（'w' 朝西、'n' 朝北、's' 朝南）；a 为沿正面水平方向的坐标（朝西时取 y，朝南北时取 x）
// zones 可带 only，仅在列出的使用状态显示
import { MODELS as BASE } from '../schemes.js';
import { buildRooms, ROOM_META, CEIL_ROOMS } from './rooms.js';

export const STATES = [
  { key: 'daily', label: '收起' },
  { key: 'movie', label: '观影' },
  { key: 'work', label: '工作' },
  { key: 'dine2', label: '双人餐' },
  { key: 'party', label: '多人聚会' },
  { key: 'exercise', label: '运动' },
  { key: 'guests', label: '父母来住' }, // 全屋状态：卧室 B 变成客房，客厅保持收起
];

// ───────── 三个方案共用 ─────────
const curtains = (mat) => [
  { id: 'curtainL', name: '窗帘（左）', shape: 'curtain', x: 420, y: 0, w: 300, d: 60, h: 2480, z: 20, mat, soft: true, states: { movie: { w: 1415 } } },
  { id: 'curtainR', name: '窗帘（右）', shape: 'curtain', x: 2950, y: 0, w: 300, d: 60, h: 2480, z: 20, mat, soft: true, states: { movie: { x: 1835, w: 1415 } } },
];
const entry = (mat) => [
  { id: 'fridge', name: '冰箱（厨房门旁）', shape: 'box', x: 2170, y: 7600, w: 700, d: 590, h: 1800, mat: 'fridgeWhite', access: { side: 'n', depth: 700 } },
  { id: 'sideboard', name: '餐边柜（截短、贴膜）', shape: 'cabinet', x: 1300, y: 7750, w: 850, d: 440, h: 2200, mat, mat2: 'walnutIn',
    facade: { face: 'n', doors: [[1300, 1725, 60, 2200], [1725, 2150, 60, 2200]] } },
  { id: 'shoe', name: '鞋柜（保留柜体、贴膜）', shape: 'box', x: -550, y: 6400, w: 400, d: 1200, h: 1000, mat },
];
const projection = { id: 'projection', name: '墙面投影画面（约 80 英寸）', shape: 'screen', x: 0, y: 2550, w: 4, d: 1800, h: 1010, z: 800, mat: 'projection', mount: 'wall', wallEdge: 12, only: ['movie'] };
const ceilWarm = [{ x: 1800, y: 2300, kind: 'warm' }, { x: 1800, y: 5000, kind: 'warm' }, { x: 1100, y: 7200, kind: 'warm' }];
const L0 = { level: 'L0', text: '清空上一任住户的全部活动物品与装饰，旧餐桌椅、电视与电视柜一并清走', rev: '完全可逆', basis: '诊断 #23' };
const FRIDGE = { level: 'L1', text: '冰箱移到入户南墙、厨房门旁；原餐边柜截短为 850 mm，与鞋柜一起贴膜；该处插座待确认', rev: '可逆', basis: '#22、#24；沿用第一组审查结论' };
const CURTAIN = { level: 'L1', text: '亚麻纱帘加遮光帘，观影时拉上；瑜伽垫一张', rev: '可逆', basis: '#2' };

// 折叠椅：只在用得到的状态出现，切换时原地淡入淡出（不做飞行路径，避免动画穿模）
const chair = (id, only, states) => ({
  id, name: '折叠椅', shape: 'chair', seat: 1, carried: true, w: 450, d: 450, h: 800, mat: 'oakPale', mat2: 'steelBlack',
  only, ...states.base, states: states.by,
});

// ───────── 方案四「墙」 ─────────
const S4 = {
  key: 's4',
  label: '方案四「墙」',
  title: '方案四「墙」：功能退进墙体',
  walls: { base: 'limeWhite', media: 'limeClay' },
  floor: 'tileGloss',
  ceil: ceilWarm,
  summary: '东墙做一整面 5.8 m 长、600 深的变形墙：下翻书桌、抽拉坐榻与藏起来的投影仪、双折翻板餐桌、收着 6 把折叠椅的高柜。收起时是一面无把手的浅橡木墙，打开才露出深色胡桃内里与灯光；客厅中部整片留空。',
  signature: '木墙的呼吸：收起是一面安静的浅木立面，打开时深色内里和灯光才出现。',
  exerciseZone: { x: 400, y: 1500, w: 2500, d: 2600 },
  facts: [
    ['最高层级', 'L3（整墙定制与五金）'],
    ['可逆性', '变形墙较难逆转；地毯、灯具、椅子可撤回'],
    ['主要风险', '翻板与滑轨五金的寿命；5.8 m 立面的平整度对施工要求高；板缝 3 mm 需精细安装'],
  ],
  mechanisms: [
    { name: '下翻书桌', hw: '翻板铰链 + 阻尼下翻撑，桌板 1194 × 570；桌下凳仓收一只凳', level: 'L3' },
    { name: '坐榻龛', hw: '坐面高 420，坐面到龛顶灯带净高约 1.0 m，成年人坐直不碰头；抽拉延伸板用重型全拉出滑轨，行程 400', level: 'L3' },
    { name: '投影仓上翻门', hw: '上翻支撑器（气撑），铰链轴在门板外表面上沿，开启 105°；仓内投影仪投向西墙', level: 'L3' },
    { name: '双折翻板餐桌', hw: '第一板翻板铰链挂墙（墙体为实体墙，业主确认），第二板琴键铰链，对折时压在第一板上、展开时从上方翻出；板宽 864，两端各让出 18 mm 柜体端板；折叠支腿 ×4', level: 'L3' },
    { name: '椅柜', hw: '南端高柜收 6 把折叠椅与瑜伽垫，按压开门，门前留 450', level: 'L3' },
    { name: '暗藏灯带', hw: '低压线性灯带：立面顶部洗墙、踢脚、坐榻龛顶；取电位置待确认', level: 'L2' },
  ],
  changes: [
    L0,
    { level: 'L3', text: '东墙整面变形墙（600 深、2.4 m 高、5.8 m 长），无把手浅橡木门板，板缝 3 mm，内衬胡桃；含书桌、凳、坐榻、投影仪、翻板餐桌、椅柜', rev: '较难逆转', basis: '#25；功能迁入墙体' },
    { level: 'L2', text: '西墙电视墙段刷土色灰泥涂层，兼作投影面', rev: '部分可逆', basis: '#21' },
    { level: 'L2', text: '立面顶部洗墙灯带、踢脚灯带、坐榻龛顶灯带', rev: '部分可逆', basis: '#3 分区照明' },
    { level: 'L1', text: '2100 × 2600 本色短绒羊毛地毯，和纸落地灯一盏，6 把折叠椅，飘窗坐垫', rev: '可逆', basis: '#7、#3、#12' },
    CURTAIN,
    FRIDGE,
  ],
  palette: ['oakPale', 'walnutIn', 'limeWhite', 'limeClay', 'woolLow', 'linenSand', 'ledStrip'],
  steps: {
    daily: { list: [], sec: 0 },
    movie: { list: ['抽出坐榻延伸板', '翻起投影仓门', '拉上遮光帘'], sec: 15 },
    work: { list: ['放下书桌板', '从凳仓取出凳子'], sec: 8 },
    dine2: { list: ['放下餐桌第一板与接缝支腿', '从高柜取出 2 把折叠椅'], sec: 20 },
    party: { list: ['放下餐桌第一板与接缝支腿', '从上方翻开第二板并放下端部支腿', '从高柜取出 6 把折叠椅'], sec: 45 },
    exercise: { list: ['从高柜取出瑜伽垫'], sec: 5 },
  },
  zones: [
    { name: '窗前 · 阅读', x: 1800, y: 300 },
    { name: '起居 · 观影 · 运动', x: 1500, y: 2800 },
    { name: '用餐', x: 1900, y: 5100 },
    { name: '入户', x: 1100, y: 7300 },
  ],
  parts: [
    // M1 书柜与下翻书桌
    { id: 'm1', name: '书柜与下翻书桌', shape: 'cabinet', x: 3000, y: 450, w: 600, d: 1800, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
      facade: { face: 'w', toe: 60,
        doors: [[450, 1350, 1300, 2400], [1350, 2250, 1300, 2400], [450, 750, 730, 1300], [1950, 2250, 730, 1300], [450, 1210, 60, 730], [1590, 2250, 60, 730], [1210, 1590, 480, 730]],
        recesses: [{ a: [750, 1950], z: [730, 1300], depth: 350 }, { a: [1210, 1590], z: [60, 480], depth: 450 }] } },
    { id: 'desk', name: '下翻书桌板', host: 'm1', kind: 'hinge', shape: 'panel', axis: 'y', pivot: { x: 3020, z: 730 }, span: [753, 1947], len: 570, thick: 25, dir: -1,
      angle: 90, states: { work: { angle: 0 } }, mat: 'oakPale', mat2: 'walnutIn' },
    { id: 'stoolIn', name: '凳（收在凳仓）', shape: 'stool', x: 3035, y: 1210, w: 380, d: 380, h: 420, mat: 'oakPale', mount: 'stowed',
      only: ['daily', 'movie', 'dine2', 'party', 'exercise'] },
    { id: 'stool', name: '凳', shape: 'stool', carried: true, x: 2350, y: 1160, w: 380, d: 380, h: 420, mat: 'oakPale', only: ['work'] },
    // M2 坐榻龛（净高按坐姿抬到 1450）与投影仓
    { id: 'm2', name: '坐榻龛与投影仓', shape: 'cabinet', x: 3000, y: 2250, w: 600, d: 2400, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
      facade: { face: 'w', toe: 60,
        doors: [[2250, 3300, 1450, 2400], [3600, 4650, 1450, 2400], [3300, 3600, 1450, 1900], [3300, 3600, 2300, 2400]],
        recesses: [{ a: [2250, 4650], z: [330, 1450], depth: 600 }, { a: [3300, 3600], z: [1900, 2300], depth: 400 }] } },
    { id: 'seat', name: '坐榻坐垫', shape: 'cushion', x: 3000, y: 2250, w: 480, d: 2400, h: 90, z: 330, mat: 'linenSand', mount: 'wall' },
    { id: 'back', name: '坐榻靠垫', shape: 'cushion', x: 3480, y: 2250, w: 120, d: 2400, h: 480, z: 420, mat: 'linenSand', mount: 'wall' },
    { id: 'ext', name: '坐榻延伸板（抽出）', host: 'm2', shape: 'ottoman', x: 3040, y: 2300, w: 400, d: 2300, h: 280, z: 40, mat: 'oakPale', mat2: 'linenSand', mount: 'stowed',
      states: { movie: { x: 2640, mount: 'floor' } } },
    { id: 'nicheLed', name: '坐榻龛顶灯带', headroom: { over: 'seat', min: 950 }, shape: 'led', x: 3100, y: 2270, w: 400, d: 2360, h: 15, z: 1435, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
    { id: 'projector', name: '投影仪（藏在投影仓）', shape: 'box', x: 3100, y: 3330, w: 300, d: 240, h: 120, z: 1950, mat: 'device', mount: 'wall' },
    // 上翻门：铰链轴在门板外表面上沿（side −1 让板厚向墙内生长），翻起时门角不会顶到上方门板
    { id: 'flap', name: '投影仓上翻门', host: 'm2', kind: 'hinge', shape: 'panel', axis: 'y', pivot: { x: 3000, z: 2300 }, span: [3303, 3597], len: 400, thick: 18, dir: -1, side: -1,
      angle: -90, states: { movie: { angle: 15 } }, mat: 'oakPale', mat2: 'walnutIn' },
    // M3 双折翻板餐桌（凹槽只容纳两块翻板，椅子改收在 M4）
    { id: 'm3', name: '餐桌翻板柜', shape: 'cabinet', x: 3000, y: 4650, w: 600, d: 900, h: 2400, mat: 'oakPale', mat2: 'walnutIn',
      facade: { face: 'w', toe: 60, doors: [[4650, 5550, 1640, 2400], [4650, 5550, 60, 710]], recesses: [{ a: [4650, 5550], z: [710, 1640], depth: 110 }] } },
    { id: 'leaf1', name: '餐桌第一板', host: 'm3', kind: 'hinge', shape: 'panel', axis: 'y', pivot: { x: 3040, z: 710 }, span: [4668, 5532], len: 900, thick: 30, dir: -1, order: 2,
      angle: 90, states: { dine2: { angle: 0 }, party: { angle: 0 } }, mat: 'oakPale', mat2: 'walnutIn' },
    { id: 'leaf2', name: '餐桌第二板', host: 'm3', kind: 'hinge', shape: 'panel', axis: 'y', chain: 'leaf1', span: [4668, 5532], len: 800, thick: 30, dir: -1, order: 3,
      angle: 180, states: { party: { angle: 0 } }, mat: 'oakPale', mat2: 'walnutIn' },
    { id: 'legA1', name: '接缝支腿', shape: 'box', x: 2185, y: 4680, w: 35, d: 35, h: 710, mat: 'steelBlack', only: ['dine2', 'party'] },
    { id: 'legA2', name: '接缝支腿', shape: 'box', x: 2185, y: 5485, w: 35, d: 35, h: 710, mat: 'steelBlack', only: ['dine2', 'party'] },
    { id: 'legB1', name: '端部支腿', shape: 'box', x: 1360, y: 4680, w: 35, d: 35, h: 710, mat: 'steelBlack', only: ['party'] },
    { id: 'legB2', name: '端部支腿', shape: 'box', x: 1360, y: 5485, w: 35, d: 35, h: 710, mat: 'steelBlack', only: ['party'] },
    chair('c1', ['dine2', 'party'], { base: { x: 2325, y: 4200, face: 's' }, by: { party: { x: 2540 } } }),
    chair('c2', ['dine2', 'party'], { base: { x: 1690, y: 4875, face: 'e' }, by: { party: { x: 890 } } }),
    chair('c3', ['party'], { base: { x: 1440, y: 4200, face: 's' } }),
    chair('c4', ['party'], { base: { x: 1990, y: 4200, face: 's' } }),
    chair('c5', ['party'], { base: { x: 1440, y: 5550, face: 'n' } }),
    chair('c6', ['party'], { base: { x: 1990, y: 5550, face: 'n' } }),
    // M4 椅柜
    { id: 'm4', name: '高柜（收 6 把折叠椅）', shape: 'cabinet', x: 3000, y: 5550, w: 600, d: 720, h: 2400, mat: 'oakPale', mat2: 'walnutIn', access: { side: 'w', depth: 450 },
      facade: { face: 'w', toe: 60, doors: [[5550, 5910, 60, 2400], [5910, 6270, 60, 2400]] } },
    // 灯光
    { id: 'wash', name: '立面洗墙灯带', noMesh: true, shape: 'led', x: 2900, y: 450, w: 60, d: 5820, h: 15, z: 2730, mat: 'ledStrip', mount: 'ceiling', light: 'area', lightDir: 'wash' },
    { id: 'toeLed', name: '踢脚灯带', shape: 'led', x: 3010, y: 450, w: 20, d: 5820, h: 12, z: 20, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
    { id: 'lamp', name: '和纸落地灯', shape: 'lamp', x: 2500, y: 100, w: 300, d: 300, h: 1200, mat: 'hinoki', mat2: 'washiLamp', light: 1 },
    // 软装
    { id: 'rug', name: '短绒羊毛地毯', shape: 'rug', x: 700, y: 1500, w: 2100, d: 2600, h: 10, mat: 'woolLow', cover: true },
    { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1250, y: 1900, w: 610, d: 1830, h: 6, z: 10, mat: 'yogaMat', cover: true, occupied: true, only: ['exercise'] },
    { id: 'sillCushion', name: '飘窗坐垫', shape: 'cushion', x: 520, y: -620, w: 2630, d: 570, h: 80, z: 450, mat: 'linenSand', mount: 'on' },
    ...curtains('linenSand'),
    projection,
    ...entry('oakPale'),
  ],
};

// ───────── 方案五「台」 ─────────
// 地台 450 高；空调柜机四周让出 250 的进风与检修空间（地台缺口 x 3000–3600、y 0–650）
const deck = (id, x, y, w, d) => ({ id, name: '地台', shape: 'deck', x, y, w, d, h: 400, z: 50, mat: 'tatami', mat2: 'hinoki', deck: true });
// 带靠背地面座椅：坐垫 30 厚，座面 = 台面 450 + 30 = 480；到坑底板（z 50）430，到桌面（z 760）280
const zaisu = (id, only, base) => ({
  id, name: '带靠背地面座椅', shape: 'zaisu', seat: 1, carried: true, w: 400, d: 400, h: 450, z: 450, mat: 'linenSand', mat2: 'hinoki', mount: 'deck',
  only, ...base,
});
const LIFT = ['work', 'dine2', 'party'];
const S5 = {
  key: 's5',
  label: '方案五「台」',
  title: '方案五「台」：从窗台长出来的地面',
  walls: { base: 'limeWhite', media: 'limeClay' },
  floor: 'tileGloss',
  ceil: ceilWarm,
  summary: '北半厅做一方 450 高、与飘窗台面齐平的地台，飘窗因此成了地台的延伸。台中央是掘りごたつ：桌板平时就是坑盖、与台面齐平，用餐时整块升起；人坐台边、腿放坑里、腿就在桌下，等于坐椅子吃饭。南半厅是低处的「土间」，负责入户与收纳。',
  signature: '一方会浮起来的地台：与窗台齐平，踢脚内缩藏灯，桌子从台面里整块升起。',
  exerciseZone: { x: 900, y: 650, w: 2300, d: 3550, deck: true },
  facts: [
    ['最高层级', 'L3（地台、电动升降）'],
    ['可逆性', '地台可整体拆除、不伤地砖，但属较难逆转的固定构件'],
    ['主要风险', '上下台 450 高，对父母不友好，用抽拉踏步缓解；升降桌与投影升降仓需要电源，位置待确认；空调柜机西、南两侧让出 250（北、东两侧为墙），是否满足该机型的进风与检修要求待确认'],
  ],
  mechanisms: [
    { name: '地台', hw: '实木龙骨 + 多层板台面，面铺蔺草席，边框桧木色实木；台下抽屉西侧 5 格、南侧 3 格；空调柜机西、南两侧让出 250', level: 'L3' },
    { name: '掘りごたつ升降桌', hw: '桌板 1400 × 2200 兼作坑盖，平时与台面齐平；双电动立柱升起 310，桌面距坑底 710；座面（台面加 30 厚坐垫）到坑底 430（推荐 350–400，在「最多再深约 50」的容差内）、到桌面 280', level: 'L3' },
    { name: '投影升降仓', hw: '电动升降器，行程 300；投影仪藏在台内，升起后投向西墙', level: 'L3' },
    { name: '抽拉踏步', hw: '重型滑轨 + 折叠支脚，踏面高 220，抽出 350', level: 'L3' },
    { name: '踢脚灯带', hw: '地台西、南两侧内缩 50 的踢脚内藏低压灯带', level: 'L2' },
  ],
  changes: [
    L0,
    { level: 'L3', text: '北半厅 450 高地台（约 11 ㎡，含掘りごたつ坑），与飘窗台面齐平；中央掘りごたつ坑 1400 × 2200、深 400，桌板兼作坑盖', rev: '较难逆转', basis: '高差代替家具；坑深、桌高取已核实的推荐值' },
    { level: 'L3', text: '双立柱电动升降桌、投影升降仓与投影仪、抽拉踏步', rev: '较难逆转', basis: '座面到桌面 280，取推荐值' },
    { level: 'L2', text: '东墙沿地台做 600 高亚麻软包靠背；西墙电视墙段刷土色灰泥涂层', rev: '部分可逆', basis: '#21' },
    { level: 'L2', text: '地台踢脚灯带', rev: '部分可逆', basis: '#3' },
    { level: 'L3', text: '土间一侧东墙做 450 深到顶高柜，推拉门', rev: '较难逆转', basis: '#25' },
    { level: 'L1', text: '6 把带靠背地面座椅收在台下抽屉；长坐垫、和纸落地灯、飘窗蔺草席', rev: '可逆', basis: '#3、#7、#12' },
    CURTAIN,
    FRIDGE,
  ],
  palette: ['tatami', 'hinoki', 'walnutIn', 'limeWhite', 'limeClay', 'linenSand', 'ledStrip'],
  steps: {
    daily: { list: [], sec: 0 },
    movie: { list: ['按键升起投影仪', '拉上遮光帘'], sec: 20 },
    work: { list: ['收起长坐垫', '按键升起桌板', '从台下抽屉取出 1 把座椅'], sec: 30 },
    dine2: { list: ['收起长坐垫', '按键升起桌板', '取出 2 把座椅'], sec: 35 },
    party: { list: ['收起长坐垫', '按键升起桌板', '取出 6 把座椅', '抽出踏步'], sec: 60 },
    exercise: { list: ['在台面铺开瑜伽垫'], sec: 5 },
  },
  zones: [
    { name: '地台 · 起居 · 用餐 · 运动', x: 1900, y: 900 },
    { name: '土间 · 入户 · 收纳', x: 1300, y: 5600 },
  ],
  parts: [
    deck('d1', 900, 0, 2100, 650),
    deck('d2', 900, 650, 2700, 650),
    deck('d3', 900, 1300, 700, 2200),
    deck('d4', 3000, 1300, 600, 2200),
    deck('d5', 900, 3500, 2700, 700),
    { id: 'toe1', name: '地台踢脚', shape: 'box', x: 950, y: 0, w: 2050, d: 650, h: 50, mat: 'walnutIn', deck: true },
    { id: 'toe2', name: '地台踢脚', shape: 'box', x: 950, y: 650, w: 2650, d: 3500, h: 50, mat: 'walnutIn', deck: true },
    // 台下抽屉板缝：西侧 5 格、南侧 3 格
    ...[840, 1680, 2520, 3360].map((y, i) => ({ id: `grooveW${i}`, name: '抽屉板缝', shape: 'box', x: 898, y: y - 2, w: 4, d: 4, h: 400, z: 50, mat: 'walnutIn', mount: 'wall' })),
    ...[1800, 2700].map((x, i) => ({ id: `grooveS${i}`, name: '抽屉板缝', shape: 'box', x: x - 2, y: 4198, w: 4, d: 4, h: 400, z: 50, mat: 'walnutIn', mount: 'wall' })),
    { id: 'toeLedW', name: '踢脚灯带（西）', shape: 'led', x: 955, y: 20, w: 12, d: 4110, h: 12, z: 30, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
    { id: 'toeLedS', name: '踢脚灯带（南）', shape: 'led', x: 960, y: 4135, w: 2620, d: 12, h: 12, z: 30, mat: 'ledStrip', mount: 'wall', light: 'area', lightDir: 'down' },
    // 桌板即坑盖：收起时与台面齐平（cover，可站立、可运动），升起时是餐桌
    { id: 'table', name: '升降桌板（兼坑盖）', order: 2, shape: 'slab', x: 1600, y: 1300, w: 1400, d: 2200, h: 30, z: 420, mat: 'hinoki', mount: 'deck', cover: true,
      states: Object.fromEntries(LIFT.map((k) => [k, { z: 730, cover: false }])) },
    { id: 'column1', name: '电动升降立柱', order: 2, shape: 'box', x: 2250, y: 1750, w: 100, d: 100, h: 370, z: 50, mat: 'steelBlack', mount: 'deck',
      states: Object.fromEntries(LIFT.map((k) => [k, { h: 680 }])) },
    { id: 'column2', name: '电动升降立柱', order: 2, shape: 'box', x: 2250, y: 2950, w: 100, d: 100, h: 370, z: 50, mat: 'steelBlack', mount: 'deck',
      states: Object.fromEntries(LIFT.map((k) => [k, { h: 680 }])) },
    zaisu('z1', ['work', 'dine2', 'party'], { x: 1200, y: 2200, face: 'e' }),
    zaisu('z2', ['dine2', 'party'], { x: 3000, y: 2200, face: 'w' }),
    zaisu('z3', ['party'], { x: 1200, y: 1650, face: 'e' }),
    zaisu('z4', ['party'], { x: 1200, y: 2750, face: 'e' }),
    zaisu('z5', ['party'], { x: 3000, y: 1650, face: 'w' }),
    zaisu('z6', ['party'], { x: 3000, y: 2750, face: 'w' }),
    { id: 'longCushion', name: '长坐垫', shape: 'cushion', x: 3000, y: 650, w: 500, d: 2950, h: 60, z: 450, mat: 'linenSand', mount: 'deck', carried: true,
      only: ['daily', 'movie', 'exercise'] },
    { id: 'back', name: '亚麻软包靠背', shape: 'cushion', x: 3500, y: 650, w: 100, d: 3550, h: 600, z: 450, mat: 'linenSand', mount: 'wall' },
    { id: 'projLift', name: '投影升降仓（含投影仪）', host: 'd5', shape: 'box', x: 3050, y: 3700, w: 300, d: 300, h: 120, z: 330, mat: 'steelBlack', mount: 'stowed',
      states: { movie: { z: 630, mount: 'deck' } } },
    { id: 'step', name: '抽拉踏步', host: 'd5', shape: 'box', x: 1805, y: 3850, w: 590, d: 350, h: 170, z: 50, mat: 'hinoki', mount: 'stowed',
      states: { party: { y: 4200, mount: 'floor' } } },
    // 落地灯移到西北角，离开投影光路
    { id: 'lamp', name: '和纸落地灯', shape: 'lamp', x: 950, y: 100, w: 300, d: 300, h: 900, z: 450, mat: 'hinoki', mat2: 'washiLamp', mount: 'deck', light: 1 },
    ...curtains('linenSand').map((c) => ({ ...c, z: 470, h: 2030 })), // 窗帘只垂到台面
    { id: 'sillMat', name: '飘窗蔺草席', shape: 'cushion', x: 520, y: -620, w: 2630, d: 570, h: 15, z: 450, mat: 'tatami', mount: 'on' },
    { id: 'storage', name: '土间高柜（推拉门）', shape: 'cabinet', x: 3150, y: 4400, w: 450, d: 1870, h: 2400, mat: 'oakPale', mat2: 'walnutIn', access: { side: 'w', depth: 450 },
      facade: { face: 'w', toe: 60, doors: [[4400, 5335, 60, 2400], [5335, 6270, 60, 2400]] } },
    { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1500, y: 1900, w: 610, d: 1830, h: 6, z: 450, mat: 'yogaMat', cover: true, occupied: true, mount: 'deck', only: ['exercise'] },
    projection,
    ...entry('oakPale'),
  ],
};

// ───────── 方案六「动」 ─────────
const P2 = { y: 2600 };
const S6 = {
  key: 's6',
  label: '方案六「动」',
  title: '方案六「动」：一座会走的墙',
  walls: { base: 'limeWhite', media: 'limeWhite' },
  floor: 'tileGloss',
  ceil: ceilWarm,
  summary: '一座 1800 × 600 × 2000 的烧杉体块，底部锁定脚轮，只停在两个定位点。停在南侧（P1），长厅约按 3 : 1 分成起居与双人餐；推到北侧（P2），南段扩大到约 3.1 m，放得下 6 人长桌。体块北面是卷帘幕与椅仓，南面是双折翻板桌。',
  signature: '一座深色烧杉体块在浅色长厅里移动，是整个空间唯一的重色。',
  exerciseZone: { x: 1100, y: 2050, w: 2200, d: 2150 },
  facts: [
    ['最高层级', 'L2（地面定位座需在瓷砖上开小孔；吸顶投影需明装线槽）；体块本身为独立家具'],
    ['可逆性', '体块可整体搬走；定位座留下小孔，需补孔'],
    ['主要风险', '体块高 2 m、深 0.6 m，有倾倒风险，需底部配重，定位座兼作防倾锚点；推动前必须收起翻板（进出「多人聚会」且另一端不是「收起」时，页面会先收起再移动）；推动噪声与定位精度'],
  ],
  mechanisms: [
    { name: '烧杉体块', hw: '独立柜体，底部配重；南面双折翻板桌，北面卷帘幕与椅仓（6 把折叠椅，每把 45 厚），两端开放书格', level: 'L1' },
    { name: '移动与定位', hw: '万向锁定脚轮 ×4；地面嵌入式定位座两组（P1、P2），落销定位并防倾；翻板展开时不得推动', level: 'L2' },
    { name: '双折翻板桌', hw: '第一板翻板铰链，第二板琴键铰链（对折压在第一板上）；折叠支腿；两板各 894 × 840，全开桌长 1680', level: 'L1' },
    { name: '投影', hw: '吸顶短焦投影仪（沙发前方上空，离开坐人高度），电源由原吸顶灯位经约 0.5 m 明装线槽引出；卷帘幕画面 1770 × 1000（约 80 英寸）', level: 'L2' },
  ],
  changes: [
    L0,
    { level: 'L1', text: '烧杉体块 1800 × 600 × 2000，锁定脚轮，北面卷帘幕与椅仓（6 把折叠椅），南面双折翻板桌', rev: '可逆', basis: '边界可移动；参照张智强「把物品装进会动的墙」' },
    { level: 'L2', text: '地面两组嵌入式定位座（P1 y 4200、P2 y 2600）', rev: '部分可逆（需补孔）', basis: '定位与防倾' },
    { level: 'L2', text: '吸顶短焦投影仪，明装线槽取电', rev: '部分可逆', basis: '影视与投屏；光路高于坐人头顶' },
    { level: 'L1', text: '低矮模块沙发 2200 × 950 面向南；短绒羊毛地毯（不进入体块行程）；和纸落地灯、飘窗坐垫', rev: '可逆', basis: '#16、#7、#3、#12' },
    CURTAIN,
    FRIDGE,
  ],
  palette: ['yakisugi', 'oakPale', 'limeWhite', 'linenStone', 'woolLow', 'washiLamp'],
  steps: {
    daily: { list: [], sec: 0 },
    movie: { list: ['拉下卷帘幕', '拉上遮光帘'], sec: 10 },
    work: { list: ['放下翻板第一板与支腿', '从北面椅仓取出 1 把椅子'], sec: 12 },
    dine2: { list: ['放下翻板第一板与支腿', '从北面椅仓取出 2 把椅子'], sec: 15 },
    party: { list: ['从北面椅仓取出 6 把椅子', '收起翻板（如已展开）', '解锁脚轮，把体块推到北侧定位点并落销', '翻开两块翻板、放下支腿'], sec: 60 },
    exercise: { list: ['取出瑜伽垫'], sec: 5 },
  },
  zones: [
    { name: '窗前 · 阅读', x: 1900, y: 400 },
    { name: '起居 · 观影 · 运动', x: 2200, y: 3100, only: ['daily', 'movie', 'work', 'dine2', 'exercise'] },
    { name: '起居', x: 2200, y: 1600, only: ['party'] },
    { name: '用餐', x: 2200, y: 5900, only: ['daily', 'movie', 'work', 'dine2', 'exercise'] },
    { name: '聚会长桌', x: 2200, y: 4300, only: ['party'] },
    { name: '入户', x: 1100, y: 7300 },
  ],
  parts: [
    { id: 'mod', name: '烧杉体块', order: 1, dock: { y: [4200, 2600] }, shape: 'cabinet', x: 1300, y: 4200, w: 1800, d: 600, h: 1940, z: 60, mat: 'yakisugi', mat2: 'walnutIn', states: { party: P2 },
      facade: { face: 's', toe: 0, doors: [], recesses: [
        { face: 's', a: [1750, 2650], z: [710, 1640], depth: 100 },
        { face: 'n', a: [1975, 2425], z: [80, 900], depth: 280 },
        { face: 'n', a: [1300, 1600], z: [300, 1800], depth: 280, shelves: 4 },
        { face: 'n', a: [2800, 3100], z: [300, 1800], depth: 280, shelves: 4 },
      ] } },
    { id: 'casters', name: '锁定脚轮', host: 'mod', shape: 'casters', x: 1300, y: 4200, w: 1800, d: 600, h: 60, mat: 'steelBlack', follow: 'mod', mount: 'on' },
    { id: 'housing', name: '卷帘幕盒', host: 'mod', shape: 'box', x: 1310, y: 4170, w: 1780, d: 30, h: 90, z: 1900, mat: 'steelBlack', follow: 'mod', mount: 'on' },
    { id: 'screen', name: '卷帘幕（约 80 英寸）', host: 'mod', shape: 'screen', x: 1315, y: 4176, w: 1770, d: 4, h: 1000, z: 900, mat: 'projection', follow: 'mod', mount: 'on', only: ['movie'] },
    { id: 'leaf1', name: '翻板第一板', host: 'mod', kind: 'hinge', shape: 'panel', axis: 'x', pivot: { y: 4760, z: 710 }, span: [1753, 2647], len: 840, thick: 30, dir: 1, follow: 'mod', order: 2,
      angle: 90, states: { work: { angle: 0 }, dine2: { angle: 0 }, party: { angle: 0 } }, mat: 'oakPale', mat2: 'walnutIn' },
    { id: 'leaf2', name: '翻板第二板', host: 'mod', kind: 'hinge', shape: 'panel', axis: 'x', chain: 'leaf1', span: [1753, 2647], len: 840, thick: 30, dir: 1, follow: 'mod', order: 3,
      angle: 180, states: { party: { angle: 0 } }, mat: 'oakPale', mat2: 'walnutIn' },
    { id: 'legA1', name: '支腿', shape: 'box', x: 1770, y: 5520, w: 35, d: 35, h: 710, mat: 'steelBlack', follow: 'mod', only: ['work', 'dine2', 'party'] },
    { id: 'legA2', name: '支腿', shape: 'box', x: 2595, y: 5520, w: 35, d: 35, h: 710, mat: 'steelBlack', follow: 'mod', only: ['work', 'dine2', 'party'] },
    { id: 'legB1', name: '端部支腿', shape: 'box', x: 1770, y: 6400, w: 35, d: 35, h: 710, mat: 'steelBlack', follow: 'mod', only: ['party'] },
    { id: 'legB2', name: '端部支腿', shape: 'box', x: 2595, y: 6400, w: 35, d: 35, h: 710, mat: 'steelBlack', follow: 'mod', only: ['party'] },
    // 北面椅仓：6 把折叠椅竖放，厚度方向沿南北，每把 45
    { id: 'stack', name: '椅仓内的折叠椅', host: 'mod', shape: 'chairstack', x: 1975, y: 4205, w: 450, d: 270, h: 800, z: 80, mat: 'oakPale', mat2: 'steelBlack', follow: 'mod', mount: 'on',
      count: 6, states: { work: { count: 5 }, dine2: { count: 4 }, party: { count: 0 } } },
    chair('c1', ['work', 'dine2', 'party'], { base: { x: 1975, y: 5600, face: 'n' }, by: { dine2: { x: 1300, y: 4975, face: 'e' }, party: { x: 1300, y: 3350, face: 'e' } } }),
    chair('c2', ['dine2', 'party'], { base: { x: 2650, y: 4975, face: 'w' }, by: { party: { y: 3350 } } }),
    chair('c3', ['party'], { base: { x: 1300, y: 3900, face: 'e' } }),
    chair('c4', ['party'], { base: { x: 1300, y: 4450, face: 'e' } }),
    chair('c5', ['party'], { base: { x: 2650, y: 3900, face: 'w' } }),
    chair('c6', ['party'], { base: { x: 2650, y: 4450, face: 'w' } }),
    // 地面定位座：P1 与 P2 各 4 个
    ...[4250, 4750, 2650, 3150].flatMap((y, i) => [1350, 3050].map((x, j) => (
      { id: `sock${i}${j}`, name: '地面定位座', shape: 'socket', x: x - 20, y: y - 20, w: 40, d: 40, h: 2, mat: 'steelBlack', mount: 'on', cover: true }))),
    { id: 'sofa', name: '低矮模块沙发', shape: 'sofa', face: 's', x: 1100, y: 1100, w: 2200, d: 950, h: 700, mat: 'linenStone', mat2: 'linenStone' },
    { id: 'projector', name: '吸顶短焦投影仪', shape: 'box', x: 2050, y: 2250, w: 300, d: 300, h: 120, z: 2450, mat: 'device', mount: 'ceiling' },
    { id: 'projStem', name: '投影仪吊杆', shape: 'box', x: 2185, y: 2385, w: 30, d: 30, h: 180, z: 2570, mat: 'steelBlack', mount: 'ceiling' },
    { id: 'rug', name: '短绒羊毛地毯', shape: 'rug', x: 1000, y: 900, w: 2400, d: 1600, h: 10, mat: 'woolLow', cover: true },
    { id: 'lamp', name: '和纸落地灯', shape: 'lamp', x: 2900, y: 150, w: 300, d: 300, h: 1200, mat: 'hinoki', mat2: 'washiLamp', light: 1 },
    { id: 'sillCushion', name: '飘窗坐垫', shape: 'cushion', x: 520, y: -620, w: 2630, d: 570, h: 80, z: 450, mat: 'linenStone', mount: 'on' },
    { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1300, y: 2900, w: 1830, d: 610, h: 6, mat: 'yogaMat', cover: true, occupied: true, only: ['exercise'] },
    ...curtains('linenStone'),
    ...entry('oakPale'),
  ],
};

// 全屋：各方案在其他房间的构件与说明（rooms.js），客厅构件不变；「父母来住」时客厅保持收起
const ROOMS = buildRooms(STATES.map((s) => s.key));
for (const m of [S4, S5, S6]) {
  const meta = ROOM_META[m.key];
  m.parts.push(...ROOMS[m.key]);
  m.ceil = [...m.ceil, ...CEIL_ROOMS];
  m.steps.guests = meta.guests;
  Object.assign(m, { replaces: meta.replaces, doors: meta.doors, rooms: meta.rooms });
}

// 现状沿用页面一的数据
const CURRENT = { ...BASE[0], parts: BASE[0].items, floor: 'tile' };

export const MODELS = [CURRENT, S4, S5, S6];
