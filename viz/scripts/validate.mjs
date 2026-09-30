// 数据校验：对每个模型的每个使用状态检查
// 1 物体在房间内  2 落地物体互不重叠  3 主路线净宽 ≥ 800 可达（运动状态下瑜伽垫视为占用）
// 4 运动状态在方案声明的运动区内有 ≥ 2000×1000 空地，且瑜伽垫位于运动区内  5 多人聚会 ≥ 6 座、双人餐 ≥ 2 座
import { ROOM, FIXED, ROUTE } from '../src/geometry.js';
import { MODELS, STATES, resolveItems } from '../src/schemes.js';
import { MODELS as MODELS2, STATES as STATES2 } from '../src/creative/schemes.js';
import { resolveState, poseAll, overlap3, freeRatio, present, legsOf, facadePanels, paramsOf } from '../src/creative/rig.js';

const CELL = 25;
const results = [];
const check = (model, state, name, ok, detail = '') => results.push({ model, state, name, ok, detail });

function inPoly(px, py) {
  let inside = false;
  for (let i = 0, j = ROOM.length - 1; i < ROOM.length; j = i++) {
    const [xi, yi] = ROOM[i], [xj, yj] = ROOM[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToWalls(px, py) {
  let d = Infinity;
  for (let i = 0; i < ROOM.length; i++) {
    const [x1, y1] = ROOM[i], [x2, y2] = ROOM[(i + 1) % ROOM.length];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
  }
  return d;
}

const distToRect = (px, py, r) =>
  Math.hypot(Math.max(r.x - px, 0, px - (r.x + r.w)), Math.max(r.y - py, 0, py - (r.y + r.d)));

// 矩形沿边每 50 mm 采样，内缩 1 mm 后都在多边形内
function rectInside(r) {
  const xs = [], ys = [];
  for (let x = r.x + 1; x < r.x + r.w; x += CELL) xs.push(x);
  xs.push(r.x + r.w - 1);
  for (let y = r.y + 1; y < r.y + r.d; y += CELL) ys.push(y);
  ys.push(r.y + r.d - 1);
  for (const x of xs) for (const y of [r.y + 1, r.y + r.d - 1]) if (!inPoly(x, y)) return false;
  for (const y of ys) for (const x of [r.x + 1, r.x + r.w - 1]) if (!inPoly(x, y)) return false;
  return true;
}

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

const xs0 = Math.min(...ROOM.map((p) => p[0])), xs1 = Math.max(...ROOM.map((p) => p[0]));
const ys0 = Math.min(...ROOM.map((p) => p[1])), ys1 = Math.max(...ROOM.map((p) => p[1]));
const NX = Math.ceil((xs1 - xs0) / CELL), NY = Math.ceil((ys1 - ys0) / CELL);
const cx = (i) => xs0 + (i + 0.5) * CELL, cy = (j) => ys0 + (j + 0.5) * CELL;
const cellOf = (x, y) => [Math.floor((x - xs0) / CELL), Math.floor((y - ys0) / CELL)];

function route(obstacles) {
  const half = ROUTE.clearance / 2; // 格心到障碍的距离须 ≥ 400，才保证净宽 ≥ 800
  const free = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = cx(i), y = cy(j);
    if (!inPoly(x, y) || distToWalls(x, y) < half) continue;
    if (obstacles.some((r) => distToRect(x, y, r) < half)) continue;
    free[j * NX + i] = 1;
  }
  const seen = new Uint8Array(NX * NY);
  const [si, sj] = cellOf(ROUTE.start.x, ROUTE.start.y);
  if (!free[sj * NX + si]) return ROUTE.targets.map((t) => [t.name, false]);
  const q = [[si, sj]];
  seen[sj * NX + si] = 1;
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= NX || b >= NY) continue;
      const k = b * NX + a;
      if (free[k] && !seen[k]) { seen[k] = 1; q.push([a, b]); }
    }
  }
  return ROUTE.targets.map((t) => {
    const [i, j] = cellOf(t.x, t.y);
    return [t.name, !!seen[j * NX + i]];
  });
}

function largestClear(obstacles, a, b, zone) {
  const grid = new Int32Array((NX + 1) * (NY + 1));
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = cx(i), y = cy(j);
    const outZone = x < zone.x || x > zone.x + zone.w || y < zone.y || y > zone.y + zone.d;
    const blocked = outZone || !inPoly(x, y) || obstacles.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d);
    grid[(j + 1) * (NX + 1) + i + 1] = (blocked ? 1 : 0)
      + grid[j * (NX + 1) + i + 1] + grid[(j + 1) * (NX + 1) + i] - grid[j * (NX + 1) + i];
  }
  const sum = (i, j, w, h) => grid[(j + h) * (NX + 1) + i + w] - grid[j * (NX + 1) + i + w] - grid[(j + h) * (NX + 1) + i] + grid[j * (NX + 1) + i];
  for (const [w, h] of [[a / CELL, b / CELL], [b / CELL, a / CELL]])
    for (let j = 0; j + h <= NY; j++) for (let i = 0; i + w <= NX; i++)
      if (sum(i, j, w, h) === 0) return `${Math.round(cx(i) - CELL / 2)},${Math.round(cy(j) - CELL / 2)} 起 ${w * CELL}×${h * CELL}`;
  return null;
}

for (const model of MODELS) {
  const states = model.key === 'current' ? [{ key: 'daily', label: '—' }] : STATES;
  for (const st of states) {
    const items = resolveItems(model, st.key);
    const tag = [model.label, st.label];

    const outside = [...items, ...FIXED].filter((r) => !rectInside(r)).map((r) => r.name);
    check(...tag, '物体在房间内', outside.length === 0, outside.join('、'));

    const solids = [...items.filter((r) => r.mount === 'floor' && !r.cover && !r.soft), ...FIXED];
    const clashes = [];
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++)
      if (overlap(solids[i], solids[j])) clashes.push(`${solids[i].name}×${solids[j].name}`);
    check(...tag, '落地物体互不重叠', clashes.length === 0, clashes.join('、'));

    const blockers = [...solids, ...items.filter((r) => r.mount === 'floor' && (r.soft || r.occupied))];
    const reach = route(blockers);
    const miss = reach.filter(([, ok]) => !ok).map(([n]) => n);
    check(...tag, `主路线净宽 ≥ ${ROUTE.clearance} 可达`, miss.length === 0, miss.length ? `不可达：${miss.join('、')}` : '');

    if (st.key === 'exercise') {
      const z = model.exerciseZone;
      const spot = z && largestClear(solids, 2000, 1000, z);
      check(...tag, '运动区内空地 ≥ 2000×1000', !!spot, spot || (z ? '未找到' : '方案未声明运动区'));
      const mat = items.find((r) => r.occupied);
      const inZone = mat && z && mat.x >= z.x && mat.y >= z.y && mat.x + mat.w <= z.x + z.w && mat.y + mat.d <= z.y + z.d;
      check(...tag, '瑜伽垫位于运动区内', !!inZone, mat ? '' : '未放瑜伽垫');
    }
    // 门前净空：冰箱门、柜门前方的操作空间不被落地物体占用
    const blocked = [];
    for (const it of items.filter((r) => r.access)) {
      const { side, depth } = it.access;
      const zone = side === 'n' ? { x: it.x, y: it.y - depth, w: it.w, d: depth }
        : side === 's' ? { x: it.x, y: it.y + it.d, w: it.w, d: depth }
        : side === 'w' ? { x: it.x - depth, y: it.y, w: depth, d: it.d }
        : { x: it.x + it.w, y: it.y, w: depth, d: it.d };
      for (const o of solids) if (o !== it && overlap(zone, o)) blocked.push(`${it.name}前被${o.name}占用`);
    }
    if (items.some((r) => r.access)) check(...tag, '门前净空', blocked.length === 0, blocked.join('、'));

    const seats = items.reduce((s, r) => s + (r.seat || 0), 0);
    if (st.key === 'party') check(...tag, '多人聚会餐座 ≥ 6', seats >= 6, `${seats} 座`);
    if (st.key === 'dine2') check(...tag, '双人餐餐座 ≥ 2', seats >= 2, `${seats} 座`);
  }
}

// ───────── 页面二：创意三方案 ─────────
// 构件与宿主柜体、铰链链上的相邻板之间不算冲突
const related = (a, b) => a.host === b.id || b.host === a.id || a.chain === b.id || b.chain === a.id
  || (a.host && a.host === b.host && (a.kind === 'hinge' || b.kind === 'hinge'));
const solid2 = (r) => (r.mount === 'floor' || r.mount === 'deck') && !r.soft && (!r.cover || (r.z || 0) >= 20);
const accessZone = (it) => {
  const { side, depth } = it.access;
  return side === 'n' ? { x: it.x, y: it.y - depth, w: it.w, d: depth, z: 0, h: 2000 }
    : side === 's' ? { x: it.x, y: it.y + it.d, w: it.w, d: depth, z: 0, h: 2000 }
    : side === 'w' ? { x: it.x - depth, y: it.y, w: depth, d: it.d, z: 0, h: 2000 }
    : { x: it.x + it.w, y: it.y, w: depth, d: it.d, z: 0, h: 2000 };
};
const FIXED3 = FIXED.map((f) => ({ ...f, z: 0, mount: 'floor' }));
const metrics2 = {};
const keys2 = STATES2.map((s) => s.key);

for (const model of MODELS2.filter((m) => m.key !== 'current')) {
  for (const st of STATES2) {
    const items = resolveState(model, st.key);
    const tag = [model.label, st.label];

    const outside = [...items, ...FIXED].filter((r) => !rectInside(r)).map((r) => r.name);
    check(...tag, '物体在房间内', outside.length === 0, outside.join('、'));

    const solids = [...items.filter(solid2), ...FIXED3];
    const clashes = [];
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++)
      if (!related(solids[i], solids[j]) && overlap3(solids[i], solids[j])) clashes.push(`${solids[i].name}×${solids[j].name}`);
    check(...tag, '实体互不重叠（含高度）', clashes.length === 0, clashes.join('、'));

    // 通行只看落地物体与地台（地台上的物体不挡地面通道）
    const floorBlock = [...items.filter((r) => r.mount === 'floor' && (!r.cover || r.occupied)), ...FIXED];
    const miss = route(floorBlock).filter(([, ok]) => !ok).map(([n]) => n);
    check(...tag, `主路线净宽 ≥ ${ROUTE.clearance} 可达`, miss.length === 0, miss.length ? `不可达：${miss.join('、')}` : '');

    if (st.key === 'exercise') {
      const z = model.exerciseZone;
      const obst = z.deck
        ? items.filter((r) => r.mount === 'deck' && !r.cover)
        : [...items.filter((r) => r.mount === 'floor' && !r.cover && !r.deck), ...FIXED];
      const spot = largestClear(obst, 2000, 1000, z);
      check(...tag, `运动区内空地 ≥ 2000×1000${z.deck ? '（台面）' : ''}`, !!spot, spot || '未找到');
      const mat = items.find((r) => r.occupied);
      const inZone = mat && mat.x >= z.x && mat.y >= z.y && mat.x + mat.w <= z.x + z.w && mat.y + mat.d <= z.y + z.d;
      check(...tag, '瑜伽垫位于运动区内', !!inZone, mat ? '' : '未放瑜伽垫');
    }

    const blocked = [];
    for (const it of items.filter((r) => r.access)) {
      const zone = accessZone(it);
      for (const o of solids) if (o !== it && overlap3(zone, o)) blocked.push(`${it.name}前被${o.name}占用`);
    }
    if (items.some((r) => r.access)) check(...tag, '门前净空', blocked.length === 0, blocked.join('、'));

    const seats = items.reduce((s, r) => s + (r.seat || 0), 0);
    if (st.key === 'party') check(...tag, '多人聚会餐座 ≥ 6', seats >= 6, `${seats} 座`);
    if (st.key === 'dine2') check(...tag, '双人餐餐座 ≥ 2', seats >= 2, `${seats} 座`);
    if (st.key === 'daily') metrics2[model.key] = freeRatio(items);
    // 活动件不碰宿主柜体的门板与端板
    const byId = new Map(items.map((r) => [r.id, r]));
    const panelHits = [];
    for (const it of items.filter((r) => r.host && byId.has(r.host)))
      for (const pnl of facadePanels(byId.get(it.host))) if (overlap3(it, pnl)) panelHits.push(`${it.name}×${pnl.name}`);
    check(...tag, '活动件不碰门板与端板', panelHits.length === 0, panelHits.join('、'));
    // 坐姿净高
    for (const it of items.filter((r) => r.part.headroom)) {
      const seat = byId.get(it.part.headroom.over);
      const gap = it.z - (seat.z + seat.h);
      check(...tag, `坐姿净高 ≥ ${it.part.headroom.min}`, gap >= it.part.headroom.min, `${it.name}到${seat.name}顶 ${Math.round(gap)}`);
    }
    // 椅仓容量：每把折叠椅占 45
    for (const it of items.filter((r) => r.shape === 'chairstack')) {
      const cap = Math.floor(Math.min(it.w, it.d) / 45);
      const need = Math.max(...keys2.map((k) => paramsOf(it.part, k).count || 0));
      check(...tag, '椅仓容量够用', cap >= need, `容量 ${cap}，最多收 ${need}`);
    }
    // 可移动体块只能停在声明的定位点上
    for (const it of items.filter((r) => r.part.dock)) {
      const ok = it.part.dock.y.some((y) => Math.abs(it.y - y) < 1);
      check(...tag, `${it.name}停在定位点`, ok, ok ? '' : `y=${Math.round(it.y)} 不在定位点 ${it.part.dock.y.join(' / ')}`);
    }
  }

  // 扫掠冲突：按页面实际走的路径（legsOf），每段 39 点密采样；运动构件不碰静止物体，运动构件之间也不互碰
  const sweep = [];
  const pushOpen = [];
  const keys = STATES2.map((s) => s.key);
  const same = (a, b) => ['x', 'y', 'z', 'w', 'd', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.5);
  const legs = new Map();
  for (let i = 0; i < keys.length; i++) for (let j = 0; j < keys.length; j++) if (i !== j)
    for (const [A, B] of legsOf(model, keys[i], keys[j])) legs.set(`${A}>${B}`, [A, B]);
  for (const [A, B] of legs.values()) {
    const a0 = new Map(poseAll(model, A, B, 0).map((r) => [r.id, r]));
    const a1 = new Map(poseAll(model, A, B, 1).map((r) => [r.id, r]));
    const both = model.parts.filter((p) => present(p, A) && present(p, B) && !p.carried);
    const moving = new Set(both.filter((p) => !same(a0.get(p.id), a1.get(p.id))).map((p) => p.id));
    for (let s = 1; s < 40; s++) {
      const t = s / 40;
      const at = poseAll(model, A, B, t).filter((r) => both.some((p) => p.id === r.id));
      const phys = [...at.filter((r) => r.mount !== 'ceiling' && !r.cover && !r.soft), ...FIXED3];
      const atId = new Map(at.map((r) => [r.id, r]));
      for (const m of at.filter((r) => moving.has(r.id) && r.host && atId.has(r.host)))
        for (const pnl of facadePanels(atId.get(m.host))) if (overlap3(m, pnl)) sweep.push(`${A}→${B} ${Math.round(t * 100)}%：${m.name}×${pnl.name}`);
      for (const base of at.filter((r) => r.part.dock && moving.has(r.id))) {
        const y0 = a0.get(base.id).y, y1 = a1.get(base.id).y;
        if (!(Math.abs(base.y - y0) > 0.5 && Math.abs(base.y - y1) > 0.5)) continue; // 只看推动途中
        for (const h of at.filter((r) => r.kind === 'hinge' && r.part.follow === base.id))
          if (Math.abs(h.angle - paramsOf(h.part, 'daily').angle) > 0.5) pushOpen.push(`${A}→${B} ${Math.round(t * 100)}%：${h.name}未收起`);
      }
      for (const m of at.filter((r) => moving.has(r.id))) {
        for (const o of phys) {
          if (o.id === m.id || related(m, o)) continue;
          if (moving.has(o.id) && o.id < m.id) continue; // 运动对只算一次
          if (overlap3(m, o)) sweep.push(`${A}→${B} ${Math.round(t * 100)}%：${m.name}×${o.name}`);
        }
      }
    }
  }
  check(model.label, '全部状态切换', `变形扫掠无碰撞（${legs.size} 段 × 39 采样）`, sweep.length === 0, [...new Set(sweep)].slice(0, 6).join('；'));
  if (model.parts.some((p) => p.dock)) check(model.label, '全部状态切换', '推动体块时翻板已收起', pushOpen.length === 0, [...new Set(pushOpen)].slice(0, 4).join('；'));
}
for (const [k, v] of Object.entries(metrics2)) {
  const m = MODELS2.find((x) => x.key === k);
  console.log(`空置率  ${m.label} / 收起：地面 ${(v.floor * 100).toFixed(0)}%，含台面 ${(v.usable * 100).toFixed(0)}%`);
}

// 现状的家具位置由全景推测，结果只作诊断参考，不计入通过或失败
let pass = 0, fail = 0, info = 0;
for (const r of results) {
  const ref = r.model === '现状';
  if (ref) info++; else r.ok ? pass++ : fail++;
  const flag = ref ? (r.ok ? 'INFO' : 'INFO!') : r.ok ? 'PASS' : 'FAIL';
  console.log(`${flag.padEnd(5)}  ${r.model} / ${r.state} / ${r.name}${r.detail ? '  ' + r.detail : ''}`);
}
console.log(`\n方案 ${pass + fail} 项：通过 ${pass}，失败 ${fail}；现状参考 ${info} 项`);
process.exit(fail ? 1 : 0);
