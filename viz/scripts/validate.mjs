// 数据校验：对每个模型的每个使用状态检查
// 1 物体在房间内  2 落地物体互不重叠  3 主路线净宽 ≥ 800 可达（运动状态下瑜伽垫视为占用）
// 4 运动状态在方案声明的运动区内有 ≥ 2000×1000 空地，且瑜伽垫位于运动区内  5 多人聚会 ≥ 6 座、双人餐 ≥ 2 座
import { ROOM, FIXED, ROUTE } from '../src/geometry.js';
import { MODELS, STATES, resolveItems } from '../src/schemes.js';

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
