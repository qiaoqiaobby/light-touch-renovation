// 拼贴板方案检查：数据完整、色板、现状硬装取舍、卧室与厨卫摆放、文字禁词
// 用法：node boards/scripts/check.mjs [--mutate]
// 先跑 python3 boards/scripts/crop.py 生成 mid/jalo/crops/crops.json。客厅布局沿用户型三维，另由 npm run audit:plan 检查。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS, DOORS } from '../../src/floorplan/plan-data.ts';
import { SCHEMES as LAYOUTS, SCENES, resolvePieces } from '../../src/floorplan/living-schemes.ts';
import { SCHEMES, RULES } from '../data/schemes.mjs';
import { FIXED, RETAINED, BOARD_ROOMS } from '../data/house.mjs';
import * as M from '../src/metrics.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const crops = JSON.parse(readFileSync(resolve(root, 'mid/jalo/crops/crops.json'), 'utf8'));
const polyOf = (id) => ROOMS.find((r) => r.id === id).poly;

/** 买家秀里的品牌、系列名与型号，以及价格写法。页面与数据里都不许出现。 */
export const BANNED = [
  '伽罗', 'JALO', '索耐特', '伊姆斯', '巴塞罗那', 'LC3', '嗅嗅', '阿满', '麦子柜', '万象', '魔方柜', '魔法柜', '河马',
  '宝物柜', '大象柜', '亮堂', '月光宝阁', '笑脸', 'K字柜', 'C10', 'C11', 'C12', 'S09', 'S29', 'S49', 'S99', 'S109', 'ARI',
  '熊抱', '猫耳', '毛毛虫', '如意屏风', '马尾毛', '春风习习', '小蛮腰', '桔灯', '安娜', '丰收之角', '星座吸顶', '卡拉拉', '复刻',
  '¥', '￥', '价格', '元/',
];

const layoutPieces = (layout) => {
  const L = LAYOUTS.find((s) => s.id === layout);
  const all = new Map();
  for (const sc of SCENES) for (const p of resolvePieces(L, sc.id)) if (!all.has(p.id)) all.set(p.id, p);
  return all;
};

function strings(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => strings(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => strings(v, out));
  return out;
}

export function check(schemes) {
  const problems = [];
  const facts = { schemes: {} };
  const bad = (s, msg) => problems.push(`${s}：${msg}`);

  for (const s of schemes) {
    const f = { cover: {}, retained: {}, beds: {}, gaps: {}, reach: {}, counts: {} };
    facts.schemes[s.id] = f;
    const tag = s.name;

    /* 色板 */
    const nMain = s.palette.main.length;
    const nAccent = s.palette.accent.length;
    f.counts = { main: nMain, accent: nAccent };
    if (!s.control && (nMain > RULES.mainMax || nAccent > RULES.accentMax)) bad(tag, `主色 ${nMain}、点缀 ${nAccent}，超过 ${RULES.mainMax} + ${RULES.accentMax}`);
    if (s.control && nMain <= RULES.mainMax && nAccent <= RULES.accentMax) bad(tag, '标为对照，但色数并未超出上限');
    for (const c of [...s.palette.main, ...s.palette.accent]) {
      const lab = M.hexToLab(c.hex);
      const support = c.from.some((id) => crops[id]?.palette.some((p) => M.deltaE00(p.lab, lab) <= RULES.deltaE));
      if (!support) bad(tag, `色板「${c.name}」在它标注的来源裁切里找不到 ΔE ≤ ${RULES.deltaE} 的颜色`);
    }
    const colours = M.schemeColours(s, crops, RETAINED);

    /* 现状硬装 */
    for (const r of RETAINED) {
      const d = s.retained[r.id];
      if (!d) {
        bad(tag, `没有决定「${r.name}」保留还是改动`);
        continue;
      }
      const fit = M.retainedFit(r, s, crops, RULES);
      f.retained[r.id] = { ...fit, keep: d.keep };
      if (d.keep && !fit.fits) bad(tag, `保留「${r.name}」，但它与${r.large ? '主色' : '色板'}最近色差 ΔE ${fit.dE}（${fit.near}），超过 ${RULES.deltaE}`);
      if (!d.keep && !(d.level && d.text)) bad(tag, `「${r.name}」改动没有写层级和做法`);
    }

    /* 房间 */
    for (const room of BOARD_ROOMS.filter((r) => r.id !== 'house')) {
      const R = s.rooms[room.id];
      if (!R) {
        bad(tag, `缺少房间 ${room.name}`);
        continue;
      }
      const need = ['K', 'Bath'].includes(room.id) ? 1 : 2;
      if (R.tiles.length < need) bad(tag, `${room.name} 拼贴少于 ${need} 块`);
      if (!R.changes?.length) bad(tag, `${room.name} 没有改动清单`);
      for (const c of R.changes ?? []) if (!/^L[0-4]$/.test(c.level)) bad(tag, `${room.name} 改动层级写法不对：${c.level}`);

      const planIds = new Set((R.pieces ?? []).map((p) => p.id));
      if (room.plan === 'L') {
        for (const id of layoutPieces(s.layout).keys()) planIds.add(id);
        for (const other of ['L', 'E']) for (const p of s.rooms[other]?.pieces ?? []) planIds.add(p.id);
      }
      for (const t of R.tiles) {
        if (!crops[t.crop]) bad(tag, `${room.name} 引用了不存在的裁切 ${t.crop}`);
        if (t.piece && !planIds.has(t.piece)) bad(tag, `${room.name} 拼贴指向不存在的物件 ${t.piece}`);
        if (!t.piece && !['小件', '材质'].includes(t.use)) bad(tag, `${room.name} 的 ${t.crop} 既没有对应物件，也没有声明是小件或材质`);
        if (!t.take) bad(tag, `${room.name} 的 ${t.crop} 没写取什么`);
        const clash = (crops[t.crop]?.tags ?? []).filter((x) => (s.exclude ?? []).includes(x));
        if (clash.length) bad(tag, `${room.name} 的 ${t.crop} 是${clash.join('、')}，这个方案声明不用`);
        if (crops[t.crop] && !t.crop.startsWith('base-')) {
          const cov = M.cropCover(crops[t.crop], colours, RULES);
          f.cover[t.crop] = Math.round(cov.cover * 100) / 100;
          if (cov.cover < RULES.cropCover) {
            const off = cov.detail.filter((d) => !d.ok).map((d) => `${d.hex} 占 ${Math.round(d.share * 100)}%`).join('、');
            bad(tag, `${room.name} 的 ${t.crop} 只有 ${Math.round(cov.cover * 100)}% 落在色板里（偏离：${off}）`);
          }
        }
      }

      /* 平面：在房间内、重叠、门、柜门前、床边、通行 */
      const poly = polyOf(room.plan);
      const own = (R.pieces ?? []).map((p) => ({ ...p, mount: p.mount ?? 'floor' }));
      for (const p of own) if (!M.rectInPoly(p, poly)) bad(tag, `${room.name}：${p.name} 不在房间内`);
      if (room.plan === 'L') {
        const floorAdds = own.filter((p) => p.mount === 'floor');
        const daily = resolvePieces(LAYOUTS.find((l) => l.id === s.layout), 'daily').filter((p) => (p.mount ?? 'floor') === 'floor' && !p.cover);
        for (const p of floorAdds) for (const o of daily) if (M.overlap(p, o)) bad(tag, `${room.name}：新增 ${p.name} 压到布局里的 ${o.name}`);
        continue;
      }
      const fixed = FIXED.filter((x) => x.room === room.plan);
      const floor = own.filter((p) => p.mount === 'floor');
      for (let i = 0; i < floor.length; i++) {
        for (let j = i + 1; j < floor.length; j++) {
          const a = floor[i];
          const b = floor[j];
          if (a.tuck === b.id || b.tuck === a.id) continue;
          if (M.overlap(a, b)) bad(tag, `${room.name}：${a.name} 与 ${b.name} 重叠`);
        }
        for (const x of fixed) {
          if (floor[i].over === x.id || floor[i].tuck === x.id) continue;
          if (M.overlap(floor[i], x)) bad(tag, `${room.name}：${floor[i].name} 压到现状${x.name}`);
        }
      }
      for (const d of DOORS) {
        const zone = M.doorZone(d, poly);
        if (!zone) continue;
        const sweep = M.doorSweep(d, poly);
        for (const p of floor) {
          const host = p.over && fixed.find((x) => x.id === p.over);
          if (host && p.x >= host.x && p.y >= host.y && p.x + p.w <= host.x + host.w && p.y + p.d <= host.y + host.d) continue;
          if (M.overlap(p, zone)) bad(tag, `${room.name}：${p.name} 占了${d.name}内侧 600 净空`);
          if (sweep && M.hitsSweep(p, sweep)) bad(tag, `${room.name}：${p.name} 在${d.name}的门扇扫掠范围内`);
        }
      }
      for (const host of [...fixed, ...floor]) {
        const z = M.accessRect(host);
        if (!z) continue;
        if (!M.rectInPoly(z, poly, 2)) bad(tag, `${room.name}：${host.name} 门前净空越出房间`);
        for (const p of floor) if (p !== host && p.tuck !== host.id && M.overlap(z, p)) bad(tag, `${room.name}：${host.name} 门前被 ${p.name} 占用`);
        for (const x of fixed) if (x !== host && M.overlap(z, x)) bad(tag, `${room.name}：${host.name} 门前被现状${x.name}占用`);
      }
      const blocks = [...fixed, ...floor.filter((p) => !p.tuck)];
      for (const bed of floor.filter((p) => p.sides)) {
        const others = blocks.filter((b) => b !== bed);
        for (const side of bed.sides) {
          const fr = M.sideFree(bed, side, others, poly, RULES.bedSide);
          f.beds[`${room.id}-${side}`] = Math.round(fr * 100) / 100;
          if (fr < RULES.bedSideLength) bad(tag, `${room.name}：${bed.name} ${side} 侧可上下床的空地只占床长 ${Math.round(fr * 100)}%`);
        }
      }
      if (['A', 'B', 'C'].includes(room.plan)) {
        const door = DOORS.find((d) => M.doorZone(d, poly));
        const start = M.doorInside(door, poly);
        const { ok, cells } = M.walk(start, poly, blocks, RULES.bedroomWalk);
        if (!ok) bad(tag, `${room.name}：门内站不下 ${RULES.bedroomWalk} 宽的人`);
        const targets = [];
        for (const bed of floor.filter((p) => p.sides)) {
          for (const side of bed.sides) {
            const t = side === 'n' ? { x: bed.x, y: bed.y - RULES.bedSide, w: bed.w, d: RULES.bedSide } : { x: bed.x, y: bed.y + bed.d, w: bed.w, d: RULES.bedSide };
            targets.push([`${bed.name} ${side} 侧`, t]);
          }
        }
        for (const host of [...fixed, ...floor]) {
          const z = M.accessRect(host);
          if (z) targets.push([`${host.name}前`, z]);
        }
        for (const [name, rect] of targets) {
          const hit = M.reaches(cells, rect);
          f.reach[`${room.id}:${name}`] = hit;
          if (!hit) bad(tag, `${room.name}：从门口走不到${name}`);
        }
      }
    }

    /* 几个要写进页面的间距 */
    const a = s.rooms.A.pieces.find((p) => p.id === 'a-bed');
    const ward = FIXED.find((x) => x.id === 'a-ward');
    f.gaps.aFoot = a.x - (ward.x + ward.w);
    const b = s.rooms.B.pieces.find((p) => p.id === 'b-bed');
    const bw = FIXED.find((x) => x.id === 'b-ward');
    f.gaps.bSouth = bw.y - (b.y + b.d);
    f.gaps.bNorth = b.y - 4674;
    const desk = s.rooms.B.pieces.find((p) => p.id === 'b-desk');
    f.gaps.bDesk = desk.x - (b.x + b.w);
    f.gaps.bedB = b.h;
    const midY = Math.max(a.y, ward.y) + 300;
    f.dims = [
      { room: 'A', text: '床尾到衣柜', value: f.gaps.aFoot, line: [ward.x + ward.w, midY, a.x, midY] },
      { room: 'B', text: '床北', value: f.gaps.bNorth, line: [b.x + b.w - 300, 4674, b.x + b.w - 300, b.y] },
      { room: 'B', text: '床到衣柜', value: f.gaps.bSouth, line: [bw.x + bw.w - 300, b.y + b.d, bw.x + bw.w - 300, bw.y] },
      { room: 'B', text: '床到书桌', value: f.gaps.bDesk, line: [b.x + b.w, desk.y + desk.d / 2, desk.x, desk.y + desk.d / 2] },
    ];

    /* 禁词 */
    for (const str of strings(s)) for (const w of BANNED) if (str.includes(w)) bad(tag, `出现禁词「${w}」：${str.slice(0, 30)}`);
  }
  for (const id of new Set(schemes.flatMap((s) => Object.values(s.rooms).flatMap((r) => r.tiles.map((t) => t.crop))))) {
    const c = crops[id];
    if (c) for (const w of BANNED) if ((c.name + c.take).includes(w)) problems.push(`裁切 ${id} 的名称出现禁词「${w}」`);
  }
  return { problems, facts };
}

/* ---------------- 运行 ---------------- */

const clone = () => structuredClone(SCHEMES);
const MUTATIONS = [
  ['卧室 A 床压到衣柜', (S) => { S[0].rooms.A.pieces.find((p) => p.id === 'a-bed').x = 2700; }, /压到现状通顶衣柜/],
  ['卧室 B 书桌移进门扇扫掠', (S) => { const d = S[1].rooms.B.pieces.find((p) => p.id === 'b-desk'); d.y = 6400; }, /门扇扫掠/],
  ['卧室 C 衣架挡住门内净空', (S) => { const r = S[2].rooms.C.pieces.find((p) => p.id === 'c-rack'); r.y = 7700; }, /内侧 600 净空|门扇扫掠/],
  ['卧室 B 床北侧塞进矮柜', (S) => { S[0].rooms.B.pieces.push({ id: 'x', name: '矮柜', x: 1100, y: 4724, w: 1900, d: 450, h: 500 }); }, /n 侧可上下床/],
  ['卧室 A 斗橱挡住衣柜门前', (S) => { S[3].rooms.A.pieces.find((p) => p.id === 'a-chest').x = 2900; }, /通顶衣柜 门前被/],
  ['素木保留蓝色护墙板', (S) => { S[0].retained.blue = { keep: true }; }, /保留「蓝色护墙板」/],
  ['素木客厅放进波斯地毯', (S) => { S[0].rooms.L.tiles.push({ crop: 'rug-252', piece: 'rug', take: '试' }); }, /rug-252 是纹样/],
  ['席地客厅挂蓝色吊灯', (S) => { S[2].rooms.L.tiles.push({ crop: 'lamp-218', piece: 'l-paper', take: '试' }); }, /lamp-218 只有/],
  ['拼贴块既无物件也无用途', (S) => { delete S[1].rooms.K.tiles[0].use; }, /既没有对应物件/],
  ['写进品牌名', (S) => { S[2].claim += '索耐特'; }, /禁词「索耐特」/],
  ['木与钢再加一个点缀色', (S) => { S[1].palette.accent.push({ name: '红', hex: '#b03a2e', from: ['lamp-crown-201'] }); }, /超过 3 \+ 1/],
  ['色板颜色凭空捏造', (S) => { S[0].palette.accent[0] = { name: '紫', hex: '#7a3fa0', from: ['bench-144'] }; }, /找不到 ΔE/],
  ['卧室 C 斗柜移出墙外', (S) => { S[0].rooms.C.pieces.find((p) => p.id === 'c-chest').x = 2400; }, /不在房间内/],
];

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { problems, facts } = check(SCHEMES);
  writeFileSync(resolve(root, 'mid/board-facts.json'), JSON.stringify(facts, null, 1));
  let total = 0;
  for (const s of SCHEMES) {
    const f = facts.schemes[s.id];
    const covers = Object.values(f.cover);
    total += covers.length;
    const minCover = Math.min(...covers);
    const kept = Object.entries(f.retained).filter(([, v]) => v.keep).length;
    console.log(`${s.name}：拼贴 ${covers.length} 块，色板覆盖最低 ${Math.round(minCover * 100)}%；现状硬装保留 ${kept}/${RETAINED.length}；` +
      `卧室 A 床尾到衣柜 ${f.gaps.aFoot}，卧室 B 床北 ${f.gaps.bNorth}、床南到衣柜 ${f.gaps.bSouth}、床到书桌 ${f.gaps.bDesk}`);
  }
  console.log(`检查对象：4 个方案，拼贴块 ${total} 处，通行目标 ${Object.values(facts.schemes).reduce((n, f) => n + Object.keys(f.reach).length, 0)} 个`);
  if (problems.length) {
    console.log(`失败 ${problems.length} 项：\n  ` + problems.join('\n  '));
    process.exitCode = 1;
  } else console.log('失败 0 项');

  if (process.argv.includes('--mutate')) {
    let caught = 0;
    for (const [name, mutate, expect] of MUTATIONS) {
      const S = clone();
      mutate(S);
      const r = check(S).problems.filter((p) => !problems.includes(p));
      const ok = r.some((p) => expect.test(p));
      if (ok) caught++;
      console.log(`${ok ? '捕获' : '漏掉'}：${name}${ok ? '' : `（新增问题：${r.join('；') || '无'}）`}`);
    }
    console.log(`变异 ${MUTATIONS.length} 项，捕获 ${caught} 项`);
    if (caught !== MUTATIONS.length) process.exitCode = 1;
  }
}
