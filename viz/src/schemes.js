// 现状与三方案的家具数据（单位 mm，坐标见 geometry.js）
// 每件物体：x/y 为平面西北角，w 沿 x（东西）、d 沿 y（南北），h 高，z 离地高度
// shape 决定绘制方式；face 为座位朝向（n/s/e/w）；cover 表示地面覆盖物（可与其他物体重叠）
// mount: floor（默认）| wall | ceiling | on（放在其他物体上），非 floor 不参与重叠与通行校验
// states: 按使用状态覆盖属性；only: 仅在列出的状态出现

export const STATES = [
  { key: 'daily', label: '日常' },
  { key: 'movie', label: '观影' },
  { key: 'dine2', label: '双人餐' },
  { key: 'party', label: '多人聚会' },
  { key: 'exercise', label: '运动' },
];

const CLEAR_L0 = {
  level: 'L0',
  text: '清空上一任住户的全部活动物品与装饰：中国结、花布罩、毛绒玩具、旧餐桌椅、电视与电视柜',
  rev: '完全可逆',
  basis: '诊断 #23；Axel Vervoordt「编辑式」',
};

const curtains = (mat) => [
  { id: 'curtainL', name: '窗帘（左）', shape: 'curtain', x: 420, y: 0, w: 300, d: 60, h: 2480, z: 20, mat, soft: true,
    states: { movie: { w: 1415 } } },
  { id: 'curtainR', name: '窗帘（右）', shape: 'curtain', x: 2950, y: 0, w: 300, d: 60, h: 2480, z: 20, mat, soft: true,
    states: { movie: { x: 1835, w: 1415 } } },
];

const windowCushion = (mat) => (
  { id: 'sillCushion', name: '飘窗坐垫', shape: 'cushion', x: 520, y: -620, w: 2630, d: 570, h: 80, z: 450, mat, mount: 'on' }
);

const shoeCabinet = (mat) => (
  { id: 'shoe', name: '鞋柜（保留柜体）', shape: 'box', x: -550, y: 6400, w: 400, d: 1200, h: 1000, mat }
);

export const MODELS = [
  // ───────────────────────── 现状 ─────────────────────────
  {
    key: 'current',
    label: '现状',
    title: '现状',
    stamp: '2026-09 VR 拍摄 · 物品均属上一任住户',
    walls: { base: 'wallCool', media: 'wallBlue' },
    ceil: [
      { x: 1800, y: 2300, kind: 'cool' },
      { x: 1800, y: 5000, kind: 'cool' },
      { x: 1100, y: 7200, kind: 'cool' },
    ],
    summary: '长条客餐厅，一张餐桌和 4 把椅子摆在沙发与电视之间的中轴上，起居区和主通道都被它占住，这个空间既不像客厅也不像餐厅。',
    diagnosis: [
      { dim: '布局动线', text: '餐桌占据中轴，看电视隔着餐桌，客厅与餐厅不分', basis: '#9、#10' },
      { dim: '光线', text: '只有北端一扇窗，进深约 8.9 m；夜间只有冷白吸顶灯，没有低位光源', basis: '#3' },
      { dim: '环境舒适', text: '抛光砖与白墙，没有地毯，回声明显', basis: '#7' },
      { dim: '材质色彩', text: '蓝色护墙板、红棕木柜、灰沙发、花布、彩色画、红色中国结，主色超过 4 种', basis: '#19、#21' },
      { dim: '收纳秩序', text: '冰箱放在客厅；餐边柜前的地面堆着米袋和蒸锅', basis: '#23、#24' },
      { dim: '被浪费的位置', text: '飘窗台空置，窗边没有可以停留的座位', basis: '#12' },
    ],
    zones: [
      { name: '餐桌占据中轴', x: 1700, y: 3650 },
      { name: '入户', x: 1100, y: 7300 },
    ],
    items: [
      { id: 'tvCab', name: '电视柜', shape: 'box', x: 0, y: 2600, w: 420, d: 1800, h: 450, mat: 'whiteTop' },
      { id: 'tv', name: '电视', shape: 'box', x: 0, y: 2800, w: 60, d: 1450, h: 830, z: 1000, mat: 'tvBlack', mount: 'wall' },
      { id: 'cooler', name: '冷风扇', shape: 'box', x: 150, y: 2050, w: 300, d: 300, h: 1100, mat: 'plasticWhite' },
      { id: 'sofa', name: '灰色转角沙发', shape: 'sofa', face: 'w', x: 2650, y: 1500, w: 950, d: 2800, h: 850, mat: 'sofaGrey', mat2: 'floralCover' },
      { id: 'chaise', name: '沙发床', shape: 'daybed', face: 'w', x: 1700, y: 900, w: 950, d: 900, h: 420, mat: 'sofaGrey', mat2: 'floralCover' },
      { id: 'table', name: '餐桌（丢弃）', shape: 'table', x: 1300, y: 3000, w: 800, d: 1300, h: 750, mat: 'whiteTop', mat2: 'blackLeg' },
      { id: 'c1', name: '餐椅', shape: 'chair', face: 'e', x: 850, y: 3150, w: 450, d: 450, h: 900, mat: 'whiteTop', mat2: 'blackLeg' },
      { id: 'c2', name: '餐椅', shape: 'chair', face: 'e', x: 850, y: 3700, w: 450, d: 450, h: 900, mat: 'whiteTop', mat2: 'blackLeg' },
      { id: 'c3', name: '餐椅', shape: 'chair', face: 'w', x: 2100, y: 3150, w: 450, d: 450, h: 900, mat: 'whiteTop', mat2: 'blackLeg' },
      { id: 'c4', name: '餐椅', shape: 'chair', face: 'w', x: 2100, y: 3700, w: 450, d: 450, h: 900, mat: 'whiteTop', mat2: 'blackLeg' },
      { id: 'shelf', name: '小书架', shape: 'shelf', x: 3250, y: 4450, w: 350, d: 800, h: 1800, mat: 'plasticWhite' },
      { id: 'fridge', name: '冰箱', shape: 'box', x: 2950, y: 5400, w: 650, d: 750, h: 1800, mat: 'fridgeWhite' },
      { id: 'sideboard', name: '餐边柜', shape: 'cabinet', x: 1300, y: 7750, w: 1570, d: 440, h: 2200, mat: 'redWood' },
      shoeCabinet('redWood'),
      { id: 'curtainL', name: '窗帘', shape: 'curtain', x: 420, y: 0, w: 300, d: 60, h: 2480, z: 20, mat: 'tealCurtain', soft: true },
      { id: 'curtainR', name: '窗帘', shape: 'curtain', x: 2950, y: 0, w: 300, d: 60, h: 2480, z: 20, mat: 'tealCurtain', soft: true },
    ],
  },

  // ───────────────────────── 方案一「减」 ─────────────────────────
  {
    key: 's1',
    label: '方案一「减」',
    title: '方案一「减」',
    walls: { base: 'wallWarm', media: 'wallWarm' },
    ceil: [
      { x: 1800, y: 2300, kind: 'warm' },
      { x: 1800, y: 5000, kind: 'warm' },
      { x: 1100, y: 7200, kind: 'warm' },
    ],
    summary: '格局沿用现状轴线，只做减法、软装、灯光和墙面颜色。投入最低，除刷墙与换灯外都能随时撤回。',
    facts: [
      ['最高层级', 'L2'],
      ['可逆性', '除刷墙与换灯外全部可撤回'],
      ['运动空间', '沙发前约 2.2 × 1.9 m（边几移到沙发南端）'],
      ['主要风险', '客厅与餐区仍在同一视野，分区只靠地毯和灯光暗示'],
    ],
    palette: ['wallWarm', 'oakLight', 'linenOat', 'woolRug', 'charcoal', 'lampWarm'],
    changes: [
      CLEAR_L0,
      { level: 'L1', text: '影音矮柜上放投影仪，配 90 英寸拉下幕布（画面宽约 2.0 m）代替电视', rev: '可逆', basis: '影视与投屏需求' },
      { level: 'L1', text: '2.4 m 长的低矮三人沙发靠东墙，面向影像墙，坐面前沿到幕布约 2.6 m', rev: '可逆', basis: '#16' },
      { level: 'L1', text: '2300 × 2400 mm 羊毛地毯，配一只可移动边几', rev: '可逆', basis: '#7 吸音' },
      { level: 'L1', text: '翻板腿折叠桌：收起 250 × 900，双人 850 × 900，全开 1450 × 900 坐 6 人', rev: '可逆', basis: '业主需求' },
      { level: 'L1', text: '窗边阅读椅、低书架，飘窗铺坐垫；阅读椅旁与沙发南端各一盏落地灯', rev: '可逆', basis: '#3、#12' },
      { level: 'L1', text: '亚麻纱帘加遮光帘两层，观影时拉上', rev: '可逆', basis: '#2' },
      { level: 'L1', text: '冰箱移到入户南墙、厨房门旁，原餐边柜截短为 850 mm；该处插座待确认', rev: '可逆', basis: '#24；腾出东墙南段给餐区' },
      { level: 'L2', text: '蓝色护墙板刷成暖白，保留线条', rev: '部分可逆', basis: '#21' },
      { level: 'L2', text: '吸顶灯换可调光 2700K 灯具', rev: '部分可逆', basis: '#3' },
      { level: 'L2', text: '餐边柜与鞋柜门板贴浅木纹膜', rev: '部分可逆', basis: '#22' },
    ],
    exerciseZone: { x: 400, y: 1700, w: 2250, d: 1950 },
    zones: [
      { name: '阅读角', x: 2750, y: 300 },
      { name: '起居 · 观影', x: 1500, y: 2900 },
      { name: '用餐', x: 2200, y: 5050 },
      { name: '入户', x: 1100, y: 7300 },
    ],
    items: [
      { id: 'bench', name: '影音矮柜', shape: 'box', x: 0, y: 2600, w: 400, d: 1600, h: 380, mat: 'oakLight' },
      { id: 'projector', name: '投影仪', shape: 'box', x: 100, y: 3350, w: 280, d: 300, h: 110, z: 380, mat: 'device', mount: 'on' },
      { id: 'screenBox', name: '幕布卷筒', shape: 'box', x: 0, y: 2545, w: 90, d: 1990, h: 90, z: 2440, mat: 'charcoal', mount: 'wall' },
      { id: 'screen', name: '90 英寸幕布', shape: 'screen', x: 20, y: 2545, w: 20, d: 1990, h: 1120, z: 700, mat: 'screen', mount: 'wall', only: ['movie'] },
      { id: 'sofa', name: '三人沙发', shape: 'sofa', face: 'w', x: 2650, y: 1700, w: 950, d: 2400, h: 780, mat: 'linenOat', mat2: 'linenOat' },
      { id: 'rug', name: '羊毛地毯', shape: 'rug', x: 600, y: 1700, w: 2300, d: 2400, h: 12, mat: 'woolRug', cover: true },
      { id: 'sideTable', name: '边几', shape: 'sidetable', x: 1950, y: 2700, w: 450, d: 450, h: 450, mat: 'oakLight',
        states: { exercise: { x: 2200, y: 3650 } } },
      { id: 'readChair', name: '阅读椅', shape: 'lounge', face: 's', x: 2400, y: 700, w: 750, d: 750, h: 750, mat: 'linenOat', mat2: 'oakLight' },
      { id: 'lamp1', name: '阅读落地灯', shape: 'lamp', x: 2150, y: 650, w: 250, d: 250, h: 1600, mat: 'charcoal', mat2: 'lampWarm', light: 1 },
      { id: 'lowShelf', name: '低书架', shape: 'shelf', x: 3300, y: 500, w: 300, d: 1200, h: 800, mat: 'oakLight' },
      windowCushion('linenOat'),
      ...curtains('linenOat'),
      { id: 'lamp2', name: '沙发落地灯', shape: 'lamp', x: 3350, y: 4130, w: 250, d: 250, h: 1500, mat: 'charcoal', mat2: 'lampWarm', light: 1 },
      { id: 'table', name: '翻板腿折叠桌', shape: 'table', x: 3350, y: 4400, w: 250, d: 900, h: 750, mat: 'oakLight', mat2: 'oakLight',
        states: { dine2: { x: 1950, y: 4550, w: 850 }, party: { x: 1500, y: 4500, w: 1450 } } },
      { id: 'c1', name: '餐椅', shape: 'chair', face: 'e', seat: 1, x: 2880, y: 4420, w: 450, d: 450, h: 800, mat: 'oakLight', mat2: 'oakLight',
        states: { dine2: { x: 1500, y: 4775 }, party: { x: 1050, y: 4725 } } },
      { id: 'c2', name: '餐椅', shape: 'chair', face: 'e', seat: 1, x: 2880, y: 4900, w: 450, d: 450, h: 800, mat: 'oakLight', mat2: 'oakLight',
        states: { dine2: { x: 2800, y: 4775, face: 'w' }, party: { x: 2950, y: 4725, face: 'w' } } },
      { id: 'c3', name: '折叠椅', shape: 'chair', face: 's', seat: 1, x: 1650, y: 4050, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c4', name: '折叠椅', shape: 'chair', face: 's', seat: 1, x: 2150, y: 4050, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c5', name: '折叠椅', shape: 'chair', face: 'n', seat: 1, x: 1650, y: 5400, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c6', name: '折叠椅', shape: 'chair', face: 'n', seat: 1, x: 2150, y: 5400, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'fridge', name: '冰箱（移至厨房门旁）', shape: 'box', x: 2170, y: 7600, w: 700, d: 590, h: 1800, mat: 'fridgeWhite', access: { side: 'n', depth: 700 } },
      { id: 'sideboard', name: '餐边柜（截短、贴膜）', shape: 'cabinet', x: 1300, y: 7750, w: 850, d: 440, h: 2200, mat: 'oakLight' },
      shoeCabinet('oakLight'),
      { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1250, y: 1780, w: 610, d: 1830, h: 6, z: 12, mat: 'yogaMat', cover: true, occupied: true, only: ['exercise'] },
    ],
  },

  // ───────────────────────── 方案二「分」 ─────────────────────────
  {
    key: 's2',
    label: '方案二「分」',
    title: '方案二「分」',
    walls: { base: 'wallWarm', media: 'wallWarm' },
    ceil: [
      { x: 1800, y: 2300, kind: 'warm' },
      { x: 1100, y: 7200, kind: 'warm' },
    ],
    summary: '用一组双面书架和转向的沙发，把长厅切成窗前、起居、用餐三段。每段各有一个主用途；冰箱移到厨房门旁。',
    facts: [
      ['最高层级', 'L3'],
      ['可逆性', '收纳墙较难逆转，其余可撤回'],
      ['运动空间', '窗前约 2.2 × 1.3 m，白天光线最好'],
      ['主要风险', '书架使西侧通道收窄到约 1.8 m；吊装幕布需确认吊顶龙骨承重（待确认）'],
    ],
    palette: ['wallWarm', 'oakSmoked', 'linenTaupe', 'juteRug', 'paperShade'],
    changes: [
      CLEAR_L0,
      { level: 'L1', text: '双面开放书架 1800 × 350 × 1200，从东墙伸出，隔开起居与用餐；北面放书，南面放餐具', rev: '可逆', basis: 'Tato Architects：一件家具重组空间' },
      { level: 'L1', text: '沙发转为横向，背靠窗前区，面向南侧幕布', rev: '可逆', basis: '#9、#10' },
      { level: 'L1', text: '黄麻地毯铺在沙发与幕布之间，配一只边几', rev: '可逆', basis: '#7' },
      { level: 'L1', text: '抽拉伸缩餐桌：收起 1000 × 800 坐 2 人，拉开 1700 × 800 坐 6 人，兼作工作台', rev: '可逆', basis: '业主需求' },
      { level: 'L1', text: '冰箱移到入户南墙、厨房门旁，原餐边柜截短为 850 mm；该处插座待确认', rev: '可逆', basis: '#24；冰箱门前留足 700 mm' },
      { level: 'L1', text: '窗前留空做运动区，飘窗铺坐垫，配纸灯落地灯', rev: '可逆', basis: '#12' },
      { level: 'L2', text: '投影仪吸顶，电源由原吸顶灯位经约 1 m 明装线槽引出；书架前吊装 75 英寸幕布（宽约 1.7 m）', rev: '部分可逆', basis: '影视与投屏需求' },
      { level: 'L2', text: '原餐区灯位改挂纸灯吊灯，用偏移挂钩移到桌心上方；其余吸顶灯换可调光 2700K', rev: '部分可逆', basis: '#3 分区照明' },
      { level: 'L2', text: '护墙板刷暖白；餐边柜与鞋柜门板贴烟熏木纹膜', rev: '部分可逆', basis: '#21、#22' },
      { level: 'L3', text: '东墙南段做 450 mm 深到顶收纳墙，推拉门，收餐具、折叠椅与运动器材', rev: '较难逆转', basis: '#25' },
    ],
    exerciseZone: { x: 1000, y: 0, w: 2250, d: 1300 },
    zones: [
      { name: '窗前 · 运动 / 阅读', x: 2000, y: 600 },
      { name: '起居 · 观影', x: 2200, y: 3100 },
      { name: '用餐 · 工作', x: 2000, y: 5400 },
      { name: '入户', x: 1100, y: 7300 },
    ],
    items: [
      { id: 'sofa', name: '三人沙发（转向）', shape: 'sofa', face: 's', x: 1000, y: 1300, w: 2400, d: 950, h: 780, mat: 'linenTaupe', mat2: 'linenTaupe' },
      { id: 'rug', name: '黄麻地毯', shape: 'rug', x: 1100, y: 2250, w: 2200, d: 1650, h: 12, mat: 'juteRug', cover: true },
      { id: 'sideTable', name: '边几', shape: 'sidetable', x: 1950, y: 2600, w: 500, d: 500, h: 400, mat: 'oakSmoked' },
      { id: 'projector', name: '吸顶投影仪', shape: 'box', x: 2560, y: 1700, w: 300, d: 300, h: 120, z: 2500, mat: 'device', mount: 'ceiling' },
      { id: 'screenBox', name: '幕布卷筒', shape: 'box', x: 1880, y: 4080, w: 1660, d: 90, h: 90, z: 2470, mat: 'charcoal', mount: 'ceiling' },
      { id: 'screen', name: '75 英寸吊装幕布', shape: 'screen', x: 1880, y: 4110, w: 1660, d: 20, h: 930, z: 1000, mat: 'screen', mount: 'ceiling', only: ['movie'] },
      { id: 'divider', name: '双面开放书架', shape: 'shelf', x: 1800, y: 4200, w: 1800, d: 350, h: 1200, mat: 'oakSmoked' },
      { id: 'storage', name: '到顶收纳墙（推拉门）', shape: 'cabinet', x: 3150, y: 4550, w: 450, d: 1720, h: 2400, mat: 'oakSmoked', access: { side: 'w', depth: 450 } },
      { id: 'table', name: '抽拉伸缩餐桌', shape: 'table', x: 1300, y: 5000, w: 1000, d: 800, h: 750, mat: 'oakSmoked', mat2: 'oakSmoked',
        states: { party: { x: 1000, w: 1700 } } },
      { id: 'c1', name: '餐椅', shape: 'chair', face: 's', seat: 1, x: 1575, y: 4550, w: 450, d: 450, h: 800, mat: 'linenTaupe', mat2: 'oakSmoked',
        states: { party: { x: 1100 } } },
      { id: 'c2', name: '餐椅', shape: 'chair', face: 'n', seat: 1, x: 1575, y: 5800, w: 450, d: 450, h: 800, mat: 'linenTaupe', mat2: 'oakSmoked',
        states: { party: { x: 1100 } } },
      { id: 'c3', name: '折叠椅', shape: 'chair', face: 's', seat: 1, x: 1625, y: 4550, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c4', name: '折叠椅', shape: 'chair', face: 's', seat: 1, x: 2150, y: 4550, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c5', name: '折叠椅', shape: 'chair', face: 'n', seat: 1, x: 1625, y: 5800, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'c6', name: '折叠椅', shape: 'chair', face: 'n', seat: 1, x: 2150, y: 5800, w: 450, d: 450, h: 800, mat: 'charcoal', mat2: 'charcoal', only: ['party'] },
      { id: 'fridge', name: '冰箱（移至厨房门旁）', shape: 'box', x: 2170, y: 7600, w: 700, d: 590, h: 1800, mat: 'fridgeWhite', access: { side: 'n', depth: 700 } },
      { id: 'pendant', name: '纸灯吊灯', shape: 'pendant', x: 1650, y: 5250, w: 300, d: 300, h: 300, z: 1650, mat: 'paperShade', mount: 'ceiling', light: 1 },
      { id: 'lamp1', name: '纸灯落地灯', shape: 'lamp', x: 3300, y: 500, w: 250, d: 250, h: 1500, mat: 'charcoal', mat2: 'paperShade', light: 1 },
      windowCushion('linenTaupe'),
      ...curtains('linenTaupe'),
      { id: 'sideboard', name: '餐边柜（截短、贴膜）', shape: 'cabinet', x: 1300, y: 7750, w: 850, d: 440, h: 2200, mat: 'oakSmoked' },
      shoeCabinet('oakSmoked'),
      { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1200, y: 300, w: 1830, d: 610, h: 6, mat: 'yogaMat', cover: true, occupied: true, only: ['exercise'] },
    ],
  },

  // ───────────────────────── 方案三「空」 ─────────────────────────
  {
    key: 's3',
    label: '方案三「空」',
    title: '方案三「空」',
    walls: { base: 'wallWarm', media: 'plaster' },
    ceil: [
      { x: 1800, y: 2300, kind: 'warm' },
      { x: 1800, y: 5000, kind: 'warm' },
      { x: 1100, y: 7200, kind: 'warm' },
    ],
    summary: '参照日式席地起居，不用大沙发，把中段地面整片留给运动和席地活动。用餐仍保持椅子高度，照顾父母来访。',
    facts: [
      ['最高层级', 'L3'],
      ['可逆性', '储物墙与壁挂桌打孔较难逆转'],
      ['运动空间', '中段运动区约 2.3 × 2.7 m，最大'],
      ['主要风险', '父母坐矮榻起身不便；投影直接打在墙上，画质不如幕布；与现有生活习惯差异最大'],
    ],
    palette: ['plaster', 'wallWarm', 'cedar', 'linenIvory', 'rushMat', 'washi'],
    changes: [
      CLEAR_L0,
      { level: 'L1', text: '900 × 1800 × 300 矮榻代替沙发，配靠垫与两只坐垫', rev: '可逆', basis: '侘寂席地起居' },
      { level: 'L1', text: '蔺草地垫覆盖中段，运动与起居共用', rev: '可逆', basis: '#7' },
      { level: 'L1', text: '低凳上放超短焦投影，直接投在西墙', rev: '可逆', basis: '影视与投屏需求' },
      { level: 'L1', text: '7 只叠放凳，平时收进储物墙', rev: '可逆', basis: '父母来访，用餐保持椅高' },
      { level: 'L1', text: '两盏和纸落地灯，飘窗铺坐垫', rev: '可逆', basis: '#3、#12' },
      { level: 'L2', text: '西墙刷灰泥质感涂层，兼作投影面', rev: '部分可逆', basis: '#21' },
      { level: 'L2', text: '壁挂折叠桌：收起厚 120，双人 600 × 1200，支腿展开 1200 × 1200', rev: '部分可逆（墙面打孔）', basis: '业主需求' },
      { level: 'L2', text: '吸顶灯换可调光 2700K；鞋柜贴杉木纹膜', rev: '部分可逆', basis: '#3、#22' },
      { level: 'L3', text: '入户南墙做到顶储物墙代替餐边柜，嵌入冰箱，紧邻厨房门', rev: '较难逆转', basis: '#25' },
    ],
    exerciseZone: { x: 350, y: 1700, w: 2350, d: 2700 },
    zones: [
      { name: '窗前 · 阅读', x: 1800, y: 400 },
      { name: '席地起居 · 观影 · 运动', x: 1500, y: 3200 },
      { name: '用餐', x: 2900, y: 5000 },
      { name: '储物 · 入户', x: 1300, y: 7250 },
    ],
    items: [
      { id: 'lowBench', name: '低凳（投影台）', shape: 'box', x: 0, y: 2700, w: 350, d: 1500, h: 300, mat: 'cedar' },
      { id: 'projector', name: '超短焦投影', shape: 'box', x: 80, y: 3300, w: 260, d: 300, h: 100, z: 300, mat: 'device', mount: 'on' },
      { id: 'daybed', name: '矮榻', shape: 'daybed', face: 'w', x: 2700, y: 2100, w: 900, d: 1800, h: 300, mat: 'cedar', mat2: 'linenIvory' },
      { id: 'rush', name: '蔺草地垫', shape: 'rug', x: 400, y: 1700, w: 2300, d: 2600, h: 15, mat: 'rushMat', cover: true },
      { id: 'zabuton1', name: '坐垫', shape: 'cushion', x: 2150, y: 2300, w: 500, d: 500, h: 100, mat: 'linenIvory',
        states: { exercise: { x: 2900, y: 2250, z: 450, mount: 'on' } } },
      { id: 'zabuton2', name: '坐垫', shape: 'cushion', x: 2150, y: 3100, w: 500, d: 500, h: 100, mat: 'linenIvory',
        states: { exercise: { x: 2900, y: 2800, z: 450, mount: 'on' } } },
      { id: 'table', name: '壁挂折叠桌', shape: 'walltable', x: 3480, y: 4400, w: 120, d: 1200, h: 600, z: 150, mat: 'cedar', mount: 'wall',
        states: { dine2: { x: 3000, w: 600, h: 750, z: 0, mount: 'floor' }, party: { x: 2400, w: 1200, h: 750, z: 0, mount: 'floor' } } },
      { id: 's1', name: '叠放凳', shape: 'stool', seat: 1, x: 3110, y: 3990, w: 380, d: 380, h: 450, mat: 'cedar', only: ['dine2', 'party'],
        states: { party: { x: 1970, y: 4410 } } },
      { id: 's2', name: '叠放凳', shape: 'stool', seat: 1, x: 3110, y: 5650, w: 380, d: 380, h: 450, mat: 'cedar', only: ['dine2', 'party'],
        states: { party: { x: 1970, y: 4810 } } },
      { id: 's3', name: '叠放凳', shape: 'stool', seat: 1, x: 1970, y: 5210, w: 380, d: 380, h: 450, mat: 'cedar', only: ['party'] },
      { id: 's4', name: '叠放凳', shape: 'stool', seat: 1, x: 2500, y: 4010, w: 380, d: 380, h: 450, mat: 'cedar', only: ['party'] },
      { id: 's5', name: '叠放凳', shape: 'stool', seat: 1, x: 3050, y: 4010, w: 380, d: 380, h: 450, mat: 'cedar', only: ['party'] },
      { id: 's6', name: '叠放凳', shape: 'stool', seat: 1, x: 2500, y: 5610, w: 380, d: 380, h: 450, mat: 'cedar', only: ['party'] },
      { id: 's7', name: '叠放凳', shape: 'stool', seat: 1, x: 3050, y: 5610, w: 380, d: 380, h: 450, mat: 'cedar', only: ['party'] },
      { id: 'lamp1', name: '和纸落地灯（窗边）', shape: 'lamp', x: 2950, y: 100, w: 300, d: 300, h: 1200, mat: 'cedar', mat2: 'washi', light: 1 },
      { id: 'lamp2', name: '和纸落地灯（榻边）', shape: 'lamp', x: 3250, y: 1750, w: 300, d: 300, h: 1200, mat: 'cedar', mat2: 'washi', light: 1 },
      windowCushion('linenIvory'),
      ...curtains('linenIvory'),
      { id: 'storage', name: '到顶储物墙', shape: 'cabinet', x: 1000, y: 7600, w: 1170, d: 590, h: 2400, mat: 'cedar', access: { side: 'n', depth: 600 } },
      { id: 'fridge', name: '冰箱（嵌入）', shape: 'box', x: 2170, y: 7600, w: 700, d: 590, h: 1800, mat: 'fridgeWhite', access: { side: 'n', depth: 700 } },
      { id: 'fridgeTop', name: '冰箱上方吊柜', shape: 'cabinet', x: 2170, y: 7600, w: 700, d: 590, h: 600, z: 1800, mat: 'cedar', mount: 'on' },
      shoeCabinet('cedar'),
      { id: 'mat', name: '瑜伽垫', shape: 'rug', x: 1250, y: 2100, w: 610, d: 1830, h: 6, z: 15, mat: 'yogaMat', cover: true, occupied: true, only: ['exercise'] },
      { id: 'screen', name: '墙面投影画面（约 80 英寸）', shape: 'screen', x: 0, y: 2550, w: 4, d: 1800, h: 1010, z: 700, mat: 'plaster', mount: 'wall', only: ['movie'] },
    ],
  },
];

// 按使用状态解析出当前出现的物体（现状不区分使用状态）
export function resolveItems(model, state) {
  const st = model.key === 'current' ? 'daily' : state;
  const out = [];
  for (const it of model.items) {
    if (it.only && !it.only.includes(st)) continue;
    const o = { ...it, ...(it.states && it.states[st]) };
    delete o.states;
    o.mount = o.mount || 'floor';
    o.z = o.z || 0;
    out.push(o);
  }
  return out;
}
