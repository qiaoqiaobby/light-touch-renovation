/**
 * 全屋四套风格方案。拼贴是风格参考，平面按净尺寸核算。
 *
 * 结构：
 * - layout：客厅沿用户型三维里已通过检查的布局（s1 减 / s2 分 / s3 空），坐标不改，读 src/floorplan/living-schemes.ts。
 * - exclude：这个方案不用的材质与纹样，对应 crops.json 的 tags。
 * - palette：只列有彩度的颜色；白、灰、黑等中性色不计入主色数。from 记录取色来源的裁切。
 * - retained：现状硬装逐项决定 keep 或改动。
 * - rooms[房间].tiles：拼贴块。piece 指向平面上的物件 id（客厅指 living-schemes 的 id）；
 *   没有 piece 的块必须写 use：'小件'（不画在平面上）或 '材质'（贴膜、涂料的颜色参考）。
 * - rooms[房间].pieces：卧室与厨卫的新增物件。mount 缺省为 floor；wall / ceiling / on 不参与落地检查。
 *   tuck：椅子推进桌下时可与该桌重叠，且不算通行障碍。over：允许压在该现状固定件上。
 *   sides：床需要能上下床的长边。
 * - rooms[房间].changes：改动清单，层级与可逆性沿用 promept.md 第七节。
 */

const C = {
  warmWhite: '#ebe5da',
  oat: '#cdbfa8',
  teakLight: '#b5794a',
  smoke: '#5a3f2c',
  white: '#e8e6e2',
  teak: '#8e4e30',
  steel: '#222222',
  cobalt: '#2f74a6',
  plaster: '#d8d0c2',
  rattan: '#b9a07a',
  oldTeak: '#6b4f3a',
  moss: '#4a5a42',
  ivory: '#d8cfbf',
  cherry: '#7a3f24',
  panelBlue: '#7da7c8',
  persian: '#5a2620',
  brass: '#9a7a45',
  rose: '#c98fa9',
};

/* ---------- 卧室与厨卫的共用摆放（四个方案位置相同，名称、高度与参考图不同） ---------- */

const bedA = (o = {}) => ({ id: 'a-bed', name: '1.8 m 床（床头板挂东墙）', x: 3365, y: 1674, w: 2000, d: 1800, h: 450, sides: ['n', 's'], ...o });
const nsA = (o = {}) => [
  { id: 'a-ns1', name: '床头柜', x: 4915, y: 1174, w: 450, d: 450, h: 500, ...o },
  { id: 'a-ns2', name: '床头柜', x: 4915, y: 3524, w: 450, d: 450, h: 500, ...o },
];
const chestA = (o = {}) => ({ id: 'a-chest', name: '低斗橱', x: 3420, y: 4097, w: 800, d: 450, h: 800, access: { side: 'n', depth: 450 }, ...o });
const sillA = (o = {}) => ({ id: 'a-cushion', name: '飘窗坐垫', mount: 'on', x: 2757, y: 338, w: 2131, d: 600, h: 60, ...o });

const bedB = (o = {}) => ({ id: 'b-bed', name: '1.5 m 床（床头朝西）', x: 1009, y: 5224, w: 2050, d: 1500, h: 450, sides: ['n', 's'], ...o });
const deskB = (o = {}) => ({ id: 'b-desk', name: '书桌', x: 3617, y: 4774, w: 500, d: 1200, h: 750, ...o });
const chairB = (o = {}) => ({ id: 'b-chair', name: '书桌椅', x: 3467, y: 5149, w: 450, d: 450, h: 800, tuck: 'b-desk', ...o });

const chestC = (o = {}) => ({ id: 'c-chest', name: '斗柜', x: 2905, y: 7678, w: 1200, d: 450, h: 900, access: { side: 's', depth: 450 }, ...o });
const rackC = (o = {}) => ({ id: 'c-rack', name: '开放衣架', x: 4965, y: 8490, w: 450, d: 650, h: 1700, access: { side: 'w', depth: 450 }, ...o });
const chairC = (o = {}) => ({ id: 'c-chair', name: '椅子', x: 4000, y: 9199, w: 450, d: 450, h: 800, tuck: 'c-desk', ...o });

const commode = { id: 'bath-commode', name: '坐便凳（架在蹲便上）', x: 4425, y: 10528, w: 415, d: 558, h: 450, over: 'bath-squat', fill: '#bdbdbd' };

const LIGHT = { level: 'L2', text: '冷白吸顶灯换可调光 2700K 灯具', rev: '部分可逆' };
const CLEAR = { level: 'L0', text: '清空上一任住户的全部活动物品', rev: '可逆' };
const SQUAT_L4 = { level: 'L4', text: '蹲便改坐便：要动排污和地面，需专业人员评估', rev: '需专业评估' };
const SQUAT_L1 = { level: 'L1', text: '父母来住时，在蹲便上架一只带扶手的坐便凳，平时收起', rev: '可逆' };

export const SCHEMES = [
  {
    id: 'S1',
    name: '素木',
    exclude: ['纹样', '黄铜', '黑钢', '皮革'],
    layout: 's1',
    layoutName: '减',
    control: false,
    claim: '墙、地、顶保持素净，家具只用一种浅柚木色，织物全是本色亚麻。中古木家具是唯一的主角。',
    mix: [['侘寂', 60], ['中古', 40]],
    shared: '暖木色温',
    contrast: '灰泥、亚麻的粗，对打磨柚木、弯木的细',
    cost: '分区只靠地毯和灯光暗示；红棕木柜要贴膜才不跳色；整体最克制，可能显得太素。',
    palette: {
      main: [
        { name: '暖白', hex: C.warmWhite, from: ['bedding-white-231', 'side-round-134'] },
        { name: '燕麦亚麻', hex: C.oat, from: ['sofa-176', 'throw-242', 'side-round-134'] },
        { name: '浅柚木', hex: C.teakLight, from: ['chair-bent-146', 'cab-open-9', 'cab-tambour-92'] },
      ],
      accent: [{ name: '烟熏木', hex: C.smoke, from: ['bench-144', 'lamp-wood-211'] }],
    },
    retained: {
      tile: { keep: true },
      wall: { keep: true },
      ceiling: { keep: true },
      blue: { keep: false, level: 'L2', text: '蓝色护墙板刷暖白，保留线条' },
      redwood: { keep: false, level: 'L2', text: '餐边柜、鞋柜贴浅柚木纹膜' },
      cabwhite: { keep: true },
      bedfloor: { keep: true },
      kitblue: { keep: false, level: 'L2', text: '橱柜门贴暖白膜' },
    },
    rooms: {
      L: {
        tiles: [
          { crop: 'cab-open-9', piece: 'bench', take: '低矮体量与浅木色' },
          { crop: 'sofa-176', piece: 'sofa', take: '米白布面' },
          { crop: 'chair-rock-172', piece: 'chair', take: '弯木线条' },
          { crop: 'cab-open-12', piece: 'shelf', take: '开放格放书' },
          { crop: 'lamp-wood-196', piece: 'lamp', take: '木杆、布罩、暖光' },
          { crop: 'throw-242', piece: 'rug', take: '亚麻质感，地毯用本色羊毛' },
          { crop: 'table-round-117', piece: 'table', take: '桌面木色；形式仍按翻板折叠桌' },
          { crop: 'chair-bent-146', piece: 'c1', take: '弯木靠背' },
          { crop: 'side-round-134', piece: 'sideTable', take: '小圆几' },
          { crop: 'vase-249', piece: 'l-art', take: '墙上只挂一幅' },
        ],
        pieces: [{ id: 'l-art', name: '挂画', mount: 'wall', x: 8866, y: 7700, w: 40, d: 900, h: 600 }],
        changes: [
          CLEAR,
          { level: 'L1', text: '米白布艺沙发、浅木影音矮柜、开放低书架、弯木摇椅、木杆落地灯、本色羊毛地毯', rev: '可逆' },
          { level: 'L1', text: '翻板折叠桌配两把弯木椅，聚会时加四把折叠椅', rev: '可逆' },
          { level: 'L1', text: '飘窗铺亚麻坐垫', rev: '可逆' },
          { level: 'L2', text: '蓝色护墙板刷暖白，保留线条', rev: '部分可逆' },
          LIGHT,
        ],
      },
      E: {
        tiles: [
          { crop: 'cab-tambour-92', use: '材质', take: '浅柚木色，作鞋柜、餐边柜贴膜的颜色参考' },
          { crop: 'mirror-145', piece: 'e-mirror', take: '木框镜' },
          { crop: 'bench-144', use: '小件', take: '烟熏木色；鞋柜台面兼坐，不另加凳' },
        ],
        pieces: [{ id: 'e-mirror', name: '木框镜', mount: 'wall', x: 6778, y: 13900, w: 40, d: 500, h: 1500 }],
        changes: [
          { level: 'L2', text: '餐边柜、鞋柜贴浅柚木纹膜（红棕与方案木色差得太远）', rev: '部分可逆' },
          { level: 'L1', text: '入户东墙挂木框镜', rev: '可逆' },
        ],
      },
      A: {
        tiles: [
          { crop: 'bed-194', piece: 'a-bed', take: '木床头：做成挂墙床头板' },
          { crop: 'bedding-linen-230', piece: 'a-bed', take: '本色亚麻床品' },
          { crop: 'night-143', piece: 'a-ns1', take: '低矮床头柜' },
          { crop: 'lamp-wood-211', piece: 'a-ns2', take: '木质台灯' },
          { crop: 'chest-teak-99', piece: 'a-chest', take: '低斗橱' },
        ],
        pieces: [bedA({ fill: C.teakLight }), ...nsA({ fill: C.teakLight }), chestA({ fill: C.teakLight }), sillA({ fill: C.oat })],
        changes: [
          { level: 'L1', text: '1.8 m 平台床，床头朝东，配亚麻床品', rev: '可逆' },
          { level: 'L2', text: '床头板挂在东墙上，床架总长不超过 2000：保留西墙衣柜时，床尾才留得出 500 的通道', rev: '部分可逆' },
          { level: 'L1', text: '两只床头柜、木质台灯、低斗橱、飘窗坐垫', rev: '可逆' },
          { level: 'L0', text: '西墙通顶衣柜保留', rev: '可逆' },
        ],
      },
      B: {
        tiles: [
          { crop: 'bedding-white-231', piece: 'b-bed', take: '白色床品' },
          { crop: 'desk-123', piece: 'b-desk', take: '带抽屉的写字台' },
          { crop: 'chair-bent-148', piece: 'b-chair', take: '弯木椅、藤编座面' },
        ],
        pieces: [bedB({ fill: C.oat }), deskB({ fill: C.teakLight }), chairB({ fill: C.teakLight })],
        changes: [
          { level: 'L1', text: '1.5 m 床，床面高 450，父母起身方便；平时铺白色床品当坐榻', rev: '可逆' },
          { level: 'L1', text: '写字台与弯木椅靠东墙门北侧', rev: '可逆' },
        ],
      },
      C: {
        tiles: [
          { crop: 'cab-tambour-78', piece: 'c-chest', take: '卷帘门柜的浅木色' },
          { crop: 'chair-bent-146', piece: 'c-chair', take: '与客厅同一把弯木椅' },
        ],
        pieces: [chestC({ fill: C.teakLight }), rackC({ fill: C.oat }), chairC({ fill: C.teakLight })],
        changes: [
          { level: 'L0', text: '一体柜保留：衣柜段放衣物，书桌段做第二张桌', rev: '可逆' },
          { level: 'L1', text: '北墙斗柜、东墙开放衣架，承接伴侣的衣物', rev: '可逆' },
        ],
      },
      K: {
        tiles: [{ crop: 'cart-c-139', use: '小件', take: '可推到餐桌边的推车，平时停在玄关餐边柜旁' }],
        pieces: [],
        changes: [{ level: 'L2', text: '蓝色橱柜门贴暖白膜', rev: '部分可逆' }],
      },
      Bath: {
        tiles: [{ crop: 'lamp-moon-207', use: '小件', take: '镜前乳白圆灯' }],
        pieces: [commode],
        changes: [SQUAT_L1, { level: 'L2', text: '镜前灯换乳白圆形壁灯', rev: '部分可逆' }, SQUAT_L4],
      },
    },
  },

  {
    id: 'S2',
    name: '木与钢',
    exclude: ['纹样', '黄铜', '藤编'],
    layout: 's2',
    layoutName: '分',
    control: false,
    claim: '柚木负责温度，黑钢和白柜体负责秩序，直线为主。全屋只有一个点缀色：厨房原有的蓝色橱柜，客厅用一盏蓝色吊灯呼应。',
    mix: [['中古', 60], ['包豪斯', 40]],
    shared: '直线与方正的比例',
    contrast: '暖柚木对黑钢、白漆面',
    cost: '收纳墙属于 L3，较难撤回；西侧通道只有 964 mm；黑白对比最强，离侘寂最远；皮面冬冷夏粘。',
    palette: {
      main: [
        { name: '白', hex: C.white, from: ['cab-metal-106', 'cab-modular-15'] },
        { name: '柚木', hex: C.teak, from: ['cab-modular-15', 'cab-modular-31', 'cab-48'] },
        { name: '黑钢', hex: C.steel, from: ['cab-metal-105', 'cab-metal-106'] },
      ],
      accent: [{ name: '钴蓝', hex: C.cobalt, from: ['lamp-218', 'base-kitblue'] }],
    },
    retained: {
      tile: { keep: true },
      wall: { keep: true },
      ceiling: { keep: true },
      blue: { keep: false, level: 'L2', text: '蓝色护墙板刷白：大面积蓝会抢掉点缀色' },
      redwood: { keep: true },
      cabwhite: { keep: true },
      bedfloor: { keep: true },
      kitblue: { keep: true },
    },
    rooms: {
      L: {
        tiles: [
          { crop: 'cab-modular-15', piece: 'shelf', take: '木格架当隔断' },
          { crop: 'cab-metal-106', piece: 'storage', take: '白柜体、黑框门板' },
          { crop: 'sofa-181', piece: 'sofa', take: '皮面' },
          { crop: 'table-square-119', piece: 'table', take: '方桌，可拉长' },
          { crop: 'chair-y-157', piece: 'c1', take: '叉形靠背、纸绳座面' },
          { crop: 'lamp-218', piece: 'l-pend', take: '唯一的蓝' },
          { crop: 'cab-metal-105', use: '材质', take: '黑钢与白漆面的比例' },
        ],
        pieces: [{ id: 'l-pend', name: '餐桌吊灯', mount: 'ceiling', x: 7030, y: 10950, w: 300, d: 300, h: 300 }],
        changes: [
          CLEAR,
          { level: 'L1', text: '皮沙发背靠窗、木格架隔出三段、方形伸缩餐桌、叉形靠背椅', rev: '可逆' },
          { level: 'L2', text: '餐桌上方挂蓝色吊灯：原灯位用偏移挂钩移到桌心', rev: '部分可逆' },
          { level: 'L2', text: '吊装 75 寸幕布（吊顶承重待确认）', rev: '部分可逆' },
          { level: 'L3', text: '东墙南段 450 深收纳墙，白柜体黑框推拉门', rev: '较难逆转' },
          { level: 'L2', text: '蓝色护墙板刷白', rev: '部分可逆' },
          LIGHT,
        ],
      },
      E: {
        tiles: [
          { crop: 'cab-48', piece: 'e-shelf', take: '柚木小格，做成离地挂墙格架放钥匙和包' },
          { crop: 'base-redwood', use: '材质', take: '原红棕木柜保留：和柚木同一色系' },
        ],
        pieces: [{ id: 'e-shelf', name: '挂墙格架', mount: 'wall', x: 5013, y: 12320, w: 40, d: 720, h: 400 }],
        changes: [
          { level: 'L0', text: '餐边柜、鞋柜保留原红棕木饰面', rev: '可逆' },
          { level: 'L2', text: '鞋柜上方装挂墙格架', rev: '部分可逆' },
        ],
      },
      A: {
        tiles: [
          { crop: 'bed-195', piece: 'a-bed', take: '深色木床头：做成挂墙床头板' },
          { crop: 'cab-metal-105', piece: 'a-ns1', take: '黑白矮柜作床头柜' },
          { crop: 'lamp-desk-226', piece: 'a-ns2', take: '细腰台灯' },
          { crop: 'cab-metal-106', piece: 'a-chest', take: '黑白方柜' },
        ],
        pieces: [bedA({ fill: C.teak }), ...nsA({ fill: '#3a3a3a' }), chestA({ fill: '#3a3a3a' })],
        changes: [
          { level: 'L1', text: '1.8 m 平台床，床头朝东', rev: '可逆' },
          { level: 'L2', text: '深色木床头板挂在东墙上，床架总长不超过 2000：保留西墙衣柜时，床尾才留得出 500 的通道', rev: '部分可逆' },
          { level: 'L1', text: '黑白矮柜作床头柜、细腰台灯、黑白方柜', rev: '可逆' },
          { level: 'L0', text: '西墙通顶衣柜保留', rev: '可逆' },
        ],
      },
      B: {
        tiles: [
          { crop: 'desk-fork-128', piece: 'b-desk', take: '叉形桌腿' },
          { crop: 'chair-y-157', piece: 'b-chair', take: '与餐椅同款' },
          { crop: 'bedding-white-231', piece: 'b-bed', take: '白色床品' },
        ],
        pieces: [bedB({ fill: C.white }), deskB({ fill: C.teak }), chairB({ fill: C.teak })],
        changes: [
          { level: 'L1', text: '1.5 m 床，床面高 450', rev: '可逆' },
          { level: 'L1', text: '叉脚书桌与叉形靠背椅', rev: '可逆' },
        ],
      },
      C: {
        tiles: [
          { crop: 'cab-metal-106', piece: 'c-chest', take: '黑白方柜作斗柜' },
          { crop: 'cab-modular-31', piece: 'c-shelf', take: '柚木格架上墙' },
        ],
        pieces: [chestC({ fill: '#3a3a3a' }), rackC({ fill: C.steel }), chairC({ fill: C.teak }), { id: 'c-shelf', name: '挂墙格架', mount: 'wall', x: 2955, y: 7678, w: 1100, d: 40, h: 400 }],
        changes: [
          { level: 'L0', text: '一体柜保留', rev: '可逆' },
          { level: 'L1', text: '黑白方柜作斗柜、黑钢开放衣架', rev: '可逆' },
          { level: 'L2', text: '斗柜上方挂墙格架', rev: '部分可逆' },
        ],
      },
      K: {
        tiles: [{ crop: 'base-kitblue', use: '材质', take: '原蓝色橱柜门保留，作全屋点缀色' }],
        pieces: [],
        changes: [{ level: 'L0', text: '蓝色橱柜门保留', rev: '可逆' }],
      },
      Bath: {
        tiles: [{ crop: 'lamp-moon-207', use: '小件', take: '镜前乳白圆灯' }],
        pieces: [commode],
        changes: [SQUAT_L1, { level: 'L2', text: '镜前灯换乳白圆形壁灯', rev: '部分可逆' }, SQUAT_L4],
      },
    },
  },

  {
    id: 'S3',
    name: '席地',
    exclude: ['黄铜', '黑钢', '皮革'],
    layout: 's3',
    layoutName: '空',
    control: false,
    claim: '客厅坐得低、材料粗：柚木、藤编、蔺草、亚麻，没有金属亮面。只在客厅席地，父母住的卧室 B 仍用正常床高。',
    mix: [['日式', 50], ['昌迪加尔', 50]],
    shared: '天然纤维与柚木',
    contrast: '昌迪加尔家具的粗壮倒 V 腿，对日式陈设的轻薄',
    cost: '客厅矮榻高 300，父母起身不便；藤编、蔺草怕潮，要打理；墙面投影画质不如幕布；储物墙属于 L3。',
    palette: {
      main: [
        { name: '灰泥米', hex: C.plaster, from: ['chd-186', 'chd-188', 'lamp-paper-213'] },
        { name: '藤草', hex: C.rattan, from: ['chd-188', 'lamp-wood-196'] },
        { name: '老柚木', hex: C.oldTeak, from: ['chd-186', 'cab-cane-26', 'chd-188'] },
      ],
      accent: [{ name: '苔绿', hex: C.moss, from: ['sofa-177'] }],
    },
    retained: {
      tile: { keep: true },
      wall: { keep: false, level: 'L2', text: '西墙刷灰泥质感涂层，直接当投影面' },
      ceiling: { keep: true },
      blue: { keep: false, level: 'L2', text: '蓝色护墙板刷灰泥米' },
      redwood: { keep: true, note: '餐边柜由储物墙替换；鞋柜保留原饰面' },
      cabwhite: { keep: true },
      bedfloor: { keep: true },
      kitblue: { keep: false, level: 'L2', text: '橱柜门贴柚木纹膜' },
    },
    rooms: {
      L: {
        tiles: [
          { crop: 'chd-186', piece: 'daybed', take: '柚木框与藤编，做矮榻的参考' },
          { crop: 'cab-cane-26', piece: 'bench', take: '藤编门：投影凳兼收纳' },
          { crop: 'cab-tambour-72', piece: 'store', take: '整面卷帘门' },
          { crop: 'chd-188', piece: 'rush', take: '成组柚木藤编，草编地面' },
          { crop: 'chd-189', piece: 'table', take: '粗壮柚木桌腿' },
          { crop: 'lamp-paper-213', piece: 'l-paper', take: '纸灯暖光' },
          { crop: 'sofa-177', use: '小件', take: '苔绿只用在靠垫和坐垫上' },
        ],
        pieces: [{ id: 'l-paper', name: '纸灯（吊挂）', mount: 'ceiling', x: 8306, y: 8350, w: 400, d: 400, h: 400 }],
        changes: [
          CLEAR,
          { level: 'L1', text: '900 × 1800 × 300 柚木藤编矮榻代替沙发，苔绿靠垫', rev: '可逆' },
          { level: 'L1', text: '蔺草地垫、藤编投影凳、叠放凳、壁挂折叠桌', rev: '可逆' },
          { level: 'L1', text: '矮榻上方挂纸灯', rev: '可逆' },
          { level: 'L2', text: '西墙灰泥质感涂层作投影面；蓝色护墙板刷灰泥米', rev: '部分可逆' },
          { level: 'L3', text: '入户南墙做卷帘门储物墙，代替餐边柜，冰箱嵌入', rev: '较难逆转' },
          LIGHT,
        ],
      },
      E: {
        tiles: [
          { crop: 'cab-tambour-91', piece: 'shoe', take: '卷帘门鞋柜：若换门板取这种竖条' },
          { crop: 'cab-tambour-72', piece: 'store', take: '储物墙与客厅同一做法' },
        ],
        pieces: [],
        changes: [
          { level: 'L0', text: '鞋柜保留原红棕饰面：与老柚木同一色系；储物墙算在客厅', rev: '可逆' },
        ],
      },
      A: {
        tiles: [
          { crop: 'bedding-linen-230', piece: 'a-bed', take: '本色亚麻床品' },
          { crop: 'cab-low-28', piece: 'a-ns1', take: '圆角矮柜作床头' },
          { crop: 'lamp-paper-213', piece: 'a-ns2', take: '纸灯' },
          { crop: 'cab-cane-24', piece: 'a-chest', take: '藤编翻门柜' },
        ],
        pieces: [bedA({ name: '1.8 m 低床（床头板挂东墙）', h: 250, fill: C.rattan }), ...nsA({ fill: C.oldTeak }), chestA({ fill: C.oldTeak }), sillA({ fill: C.plaster })],
        changes: [
          { level: 'L1', text: '1.8 m 低床，床面高 250，只给业主本人和伴侣用', rev: '可逆' },
          { level: 'L2', text: '藤编床头板挂在东墙上，床架总长不超过 2000：保留西墙衣柜时，床尾才留得出 500 的通道', rev: '部分可逆' },
          { level: 'L1', text: '圆角矮柜、纸灯、藤编翻门柜、飘窗坐垫', rev: '可逆' },
          { level: 'L0', text: '西墙通顶衣柜保留', rev: '可逆' },
        ],
      },
      B: {
        tiles: [
          { crop: 'chd-189', piece: 'b-desk', take: '柚木书桌' },
          { crop: 'chd-187', piece: 'b-chair', take: '藤编靠背椅' },
          { crop: 'quilt-236', piece: 'b-bed', take: '暖色被面' },
        ],
        pieces: [bedB({ fill: C.rattan }), deskB({ fill: C.oldTeak }), chairB({ fill: C.oldTeak })],
        changes: [
          { level: 'L1', text: '1.5 m 床，床面高 450：父母的房间不做席地', rev: '可逆' },
          { level: 'L1', text: '柚木书桌与藤编靠背椅', rev: '可逆' },
        ],
      },
      C: {
        tiles: [
          { crop: 'cab-cane-24', piece: 'c-chest', take: '藤编翻门柜' },
          { crop: 'chd-187', piece: 'c-chair', take: '藤编椅' },
        ],
        pieces: [chestC({ fill: C.oldTeak }), rackC({ fill: C.rattan }), chairC({ fill: C.oldTeak })],
        changes: [
          { level: 'L0', text: '一体柜保留', rev: '可逆' },
          { level: 'L1', text: '藤编柜、木衣架', rev: '可逆' },
        ],
      },
      K: {
        tiles: [{ crop: 'cab-tambour-78', use: '材质', take: '柚木纹膜的颜色参考' }],
        pieces: [],
        changes: [{ level: 'L2', text: '蓝色橱柜门贴柚木纹膜', rev: '部分可逆' }],
      },
      Bath: {
        tiles: [{ crop: 'table-small-125', use: '小件', take: '柚木小凳，放在淋浴区外' }],
        pieces: [commode],
        changes: [SQUAT_L1, { level: 'L1', text: '柚木小凳', rev: '可逆' }, SQUAT_L4],
      },
    },
  },

  {
    id: 'S4',
    name: '暖古典',
    exclude: ['黑钢'],
    layout: 's1',
    layoutName: '减',
    control: true,
    claim: '用颜色和纹样做温度：樱桃木、波斯地毯、黄铜和乳白玻璃灯、印花床品。蓝色护墙板和红棕木柜原样保留，硬装改动最少。',
    mix: [['古典', 50], ['中古', 30], ['波斯', 20]],
    shared: '深暖木色',
    contrast: '密集纹样对素墙',
    cost: '主色 4 个、点缀 2 个，超过其他方案守的上限，所以放在这里作对照，用来试探业主能接受的颜色上限；纹样多，收纳一乱就显乱。',
    palette: {
      main: [
        { name: '象牙', hex: C.ivory, from: ['lamp-opal-208', 'chest-smile-86'] },
        { name: '樱桃木', hex: C.cherry, from: ['cab-cherry-88', 'chest-shell-104', 'base-redwood'] },
        { name: '护墙蓝', hex: C.panelBlue, from: ['base-blue'] },
        { name: '波斯深红', hex: C.persian, from: ['rug-252', 'chest-smile-84'] },
      ],
      accent: [
        { name: '黄铜', hex: C.brass, from: ['lamp-brass-204', 'lamp-deco-209'] },
        { name: '玫瑰', hex: C.rose, from: ['bedding-stripe-227'] },
      ],
    },
    retained: {
      tile: { keep: true },
      wall: { keep: true },
      ceiling: { keep: true },
      blue: { keep: true },
      redwood: { keep: true },
      cabwhite: { keep: true },
      bedfloor: { keep: true },
      kitblue: { keep: true },
    },
    rooms: {
      L: {
        tiles: [
          { crop: 'rug-252', piece: 'rug', take: '波斯纹样；尺寸仍按 1700 × 1900' },
          { crop: 'chest-shell-104', piece: 'bench', take: '樱桃木与贝壳拉手' },
          { crop: 'sofa-183', piece: 'sofa', take: '低矮布面' },
          { crop: 'chair-sheep-170', piece: 'chair', take: '羊羔绒圈椅' },
          { crop: 'lamp-bell-222', piece: 'lamp', take: '铃形灯罩' },
          { crop: 'chest-smile-84', piece: 'shelf', take: '弧形拉手' },
          { crop: 'table-cross-121', piece: 'table', take: '十字腿与樱桃木色；形式仍按翻板桌' },
          { crop: 'chair-bent-152', piece: 'c1', take: '深色弯木' },
          { crop: 'side-square-135', piece: 'sideTable', take: '小方几' },
          { crop: 'lamp-deco-209', piece: 'l-pend', take: '乳白玻璃与黄铜' },
          { crop: 'vase-245', piece: 'l-art', take: '挂画与小件成组' },
        ],
        pieces: [
          { id: 'l-pend', name: '餐区吊灯', mount: 'ceiling', x: 8330, y: 10940, w: 300, d: 300, h: 400 },
          { id: 'l-art', name: '挂画', mount: 'wall', x: 8866, y: 7700, w: 40, d: 900, h: 600 },
        ],
        changes: [
          CLEAR,
          { level: 'L0', text: '蓝色护墙板原样保留，作为四个主色之一', rev: '可逆' },
          { level: 'L1', text: '波斯地毯、樱桃木矮柜、布面沙发、羊羔绒圈椅、铃形落地灯、斗橱', rev: '可逆' },
          { level: 'L1', text: '翻板折叠桌配深色弯木椅', rev: '可逆' },
          { level: 'L2', text: '餐区乳白玻璃黄铜吊灯', rev: '部分可逆' },
          LIGHT,
        ],
      },
      E: {
        tiles: [
          { crop: 'lamp-brass-204', piece: 'e-lamp', take: '黄铜摇臂壁灯' },
          { crop: 'mirror-145', piece: 'e-mirror', take: '木框镜' },
          { crop: 'base-redwood', use: '材质', take: '原红棕木柜保留：就是樱桃木色' },
        ],
        pieces: [
          { id: 'e-lamp', name: '黄铜壁灯', mount: 'wall', x: 6778, y: 13860, w: 40, d: 200, h: 300 },
          { id: 'e-mirror', name: '木框镜', mount: 'wall', x: 6778, y: 14100, w: 40, d: 350, h: 1500 },
        ],
        changes: [
          { level: 'L0', text: '餐边柜、鞋柜保留原红棕木饰面', rev: '可逆' },
          { level: 'L2', text: '入户东墙黄铜壁灯（要走线）', rev: '部分可逆' },
          { level: 'L1', text: '木框镜', rev: '可逆' },
        ],
      },
      A: {
        tiles: [
          { crop: 'bed-cherry-192', piece: 'a-bed', take: '樱桃木高床头：做成挂墙床头板，床架不加长' },
          { crop: 'bedding-stripe-227', piece: 'a-bed', take: '条纹印花床品' },
          { crop: 'lamp-crown-201', piece: 'a-ns1', take: '褶皱罩台灯' },
          { crop: 'chest-smile-86', piece: 'a-chest', take: '弧形拉手斗柜' },
        ],
        pieces: [bedA({ fill: C.cherry }), ...nsA({ fill: C.cherry }), chestA({ fill: C.cherry })],
        changes: [
          { level: 'L1', text: '1.8 m 平台床、条纹印花床品', rev: '可逆' },
          { level: 'L2', text: '樱桃木高床头板挂在东墙上，床架总长不超过 2000：保留西墙衣柜时，床尾才留得出 500 的通道', rev: '部分可逆' },
          { level: 'L1', text: '褶皱罩台灯、弧形拉手斗柜', rev: '可逆' },
          { level: 'L0', text: '西墙通顶衣柜保留', rev: '可逆' },
        ],
      },
      B: {
        tiles: [
          { crop: 'quilt-232', piece: 'b-bed', take: '小碎花薄被' },
          { crop: 'desk-sec-96', piece: 'b-desk', take: '翻板秘书柜：收起是柜，放下是桌' },
          { crop: 'chair-bent-152', piece: 'b-chair', take: '深色弯木椅' },
        ],
        pieces: [bedB({ fill: C.ivory }), deskB({ name: '翻板秘书柜', d: 900, fill: C.cherry }), chairB({ fill: C.cherry })],
        changes: [
          { level: 'L1', text: '1.5 m 床，床面高 450，印花薄被', rev: '可逆' },
          { level: 'L1', text: '翻板秘书柜代替书桌', rev: '可逆' },
        ],
      },
      C: {
        tiles: [
          { crop: 'dresser-103', piece: 'c-chest', take: '三折镜梳妆台' },
          { crop: 'cab-cherry-88', piece: 'c-rack', take: '樱桃木高柜' },
        ],
        pieces: [
          chestC({ name: '梳妆台', w: 1000, h: 750, fill: C.cherry }),
          rackC({ name: '樱桃木高柜', h: 2000, fill: C.cherry }),
          chairC({ fill: C.cherry }),
        ],
        changes: [
          { level: 'L0', text: '一体柜保留', rev: '可逆' },
          { level: 'L1', text: '梳妆台、樱桃木高柜', rev: '可逆' },
        ],
      },
      K: {
        tiles: [
          { crop: 'cart-brass-141', use: '小件', take: '铜轮小推车，平时停在玄关餐边柜旁' },
          { crop: 'base-kitblue', use: '材质', take: '原蓝色橱柜门保留' },
        ],
        pieces: [],
        changes: [{ level: 'L0', text: '蓝色橱柜门保留', rev: '可逆' }],
      },
      Bath: {
        tiles: [{ crop: 'lamp-opal-208', use: '小件', take: '乳白玻璃灯' }],
        pieces: [commode],
        changes: [SQUAT_L1, { level: 'L2', text: '镜前灯换乳白玻璃壁灯', rev: '部分可逆' }, SQUAT_L4],
      },
    },
  },
];

/** 方案检查用的阈值：在这里改，页面与检查同时生效。 */
export const RULES = {
  deltaE: 15, // CIEDE2000，裁切主色落在方案色板这么近之内算「属于色板」
  neutralChroma: 10, // CIELAB 彩度不超过它算中性色，不计入主色
  cropCover: 0.6, // 每块裁切里属于色板或中性色的面积占比下限
  mainMax: 3,
  accentMax: 1,
  bedroomWalk: 500, // 卧室通行宽度
  bedSide: 500, // 床长边上下床的空地深度
  bedSideLength: 0.6, // 上下床空地至少覆盖床长的比例
};
