// 数据校验：对每个模型的每个使用状态检查
// 1 物体在房间内  2 落地物体互不重叠  3 主路线净宽 ≥ 800 可达（运动状态下瑜伽垫视为占用）
// 4 运动状态在方案声明的运动区内有 ≥ 2000×1000 空地，且瑜伽垫位于运动区内  5 多人聚会 ≥ 6 座、双人餐 ≥ 2 座
import { ROOM, FIXED, ROUTE, WALL_T, OPENINGS } from '../src/geometry.js';
import { HOUSE_ROOMS, HOUSE_WALLS, HOUSE_ITEMS, HOUSE_DOORS, HOUSE_REACH, wallBoxes, houseItems } from '../src/house.js';
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

// ───── 全屋设计：各方案其他房间的检查 ─────
// 保留下来（未被方案替换）的 house.js 固定件，作为静止实体参与重叠、门前净空、扫掠与通行
const houseFixed3 = (model) => houseItems(model.key, model.replaces || []).filter((it) => it.kind === 'fixed')
  .map((it) => ({ ...it, id: `house:${it.room}/${it.name}`, z: it.z || 0, mount: 'floor', fixed: true }));
const solidR = (r) => !r.soft && r.mount !== 'ceiling' && !(r.cover && (r.z || 0) < 20);
const active = (r) => r.part && r.part.sleeps && (r.kind !== 'hinge' || Math.abs(r.angle) < 1);
// 矩形是否与门扇扫掠的四分之一圆相交
function hitsSwing(r, sw) {
  const [hx, hy] = sw.hinge;
  const x0 = sw.qx > 0 ? Math.max(r.x, hx) : r.x, x1 = sw.qx > 0 ? r.x + r.w : Math.min(r.x + r.w, hx);
  const y0 = sw.qy > 0 ? Math.max(r.y, hy) : r.y, y1 = sw.qy > 0 ? r.y + r.d : Math.min(r.y + r.d, hy);
  if (x1 <= x0 || y1 <= y0) return false;
  const cx = Math.max(x0, Math.min(hx, x1)), cy = Math.max(y0, Math.min(hy, y1));
  return Math.hypot(cx - hx, cy - hy) < sw.r - 1;
}
// 房间内通行：25 mm 栅格，格心离墙与障碍 ≥ 250（净宽 ≥ 500）；地台可行走
function roomReach(room, blockers, start) {
  const P = room.poly, xs = P.map((q) => q[0]), ys = P.map((q) => q[1]);
  const X0 = Math.min(...xs), Y0 = Math.min(...ys), NXr = Math.ceil((Math.max(...xs) - X0) / CELL), NYr = Math.ceil((Math.max(...ys) - Y0) / CELL);
  const edgeDist = (px, py) => {
    let d = Infinity;
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
      d = Math.min(d, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
    }
    return d;
  };
  const free = new Uint8Array(NXr * NYr);
  for (let j = 0; j < NYr; j++) for (let i = 0; i < NXr; i++) {
    const x = X0 + (i + 0.5) * CELL, y = Y0 + (j + 0.5) * CELL;
    if (!inPolyP(P, x, y) || edgeDist(x, y) < 250 || blockers.some((b) => distToRect(x, y, b) < 250)) continue;
    free[j * NXr + i] = 1;
  }
  const seen = new Uint8Array(NXr * NYr);
  const at = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
  const [si, sj] = at(start.x, start.y);
  if (si >= 0 && sj >= 0 && si < NXr && sj < NYr && free[sj * NXr + si]) {
    const q = [[si, sj]];
    seen[sj * NXr + si] = 1;
    while (q.length) {
      const [i, j] = q.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, k = b * NXr + a;
        if (a >= 0 && b >= 0 && a < NXr && b < NYr && free[k] && !seen[k]) { seen[k] = 1; q.push([a, b]); }
      }
    }
  }
  // 目标点落在的格子可能因栅格对齐而差几毫米不满足净宽，取 3 × 3 邻域任一格可达
  return (x, y) => {
    const [i, j] = at(x, y);
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) if (a >= 0 && b >= 0 && a < NXr && b < NYr && seen[b * NXr + a]) return true;
    return false;
  };
}
// 床边：长边外侧 260 处每 100 取样，任一点可达即该边可达
function bedSides(b) {
  const longX = b.w >= b.d, pts = (fixed, a0, a1, horiz) => {
    const out = [];
    for (let a = a0 + 150; a <= a1 - 150; a += 100) out.push(horiz ? [a, fixed] : [fixed, a]);
    return out;
  };
  const N = pts(b.y - 260, b.x, b.x + b.w, true), S = pts(b.y + b.d + 260, b.x, b.x + b.w, true);
  const W = pts(b.x - 260, b.y, b.y + b.d, false), E = pts(b.x + b.w + 260, b.y, b.y + b.d, false);
  return { long: longX ? [['北', N], ['南', S]] : [['西', W], ['东', E]], all: [['北', N], ['南', S], ['西', W], ['东', E]] };
}
function roomChecks(model, st, roomItems) {
  if (!model.rooms) return;
  const fixed = houseFixed3(model);
  for (const room of HOUSE_ROOMS) {
    const R = room.id, tag = [model.label, `${st.label} · ${room.name}`];
    const mine = roomItems.filter((r) => r.part.room === R);
    const solids = [...mine.filter(solidR), ...fixed.filter((f) => f.room === R)];
    const out = mine.filter((r) => !rectInPoly(room.poly, r));
    check(...tag, '构件在房间内', out.length === 0, out.map((r) => r.name).join('、'));
    const hits = [];
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++)
      if (!related(solids[i], solids[j]) && overlap3(solids[i], solids[j])) hits.push(`${solids[i].name}×${solids[j].name}`);
    check(...tag, '实体互不重叠（含保留的固定件）', hits.length === 0, hits.join('、'));
    for (const dr of HOUSE_DOORS.filter((d) => d.room === R)) {
      const block = solids.filter((o) => (o.z || 0) < 2000 && overlap(o, dr));
      check(...tag, `${dr.name}内 600 净空`, block.length === 0, block.map((o) => o.name).join('、'));
      const sliding = model.doors && model.doors[R] === 'sliding';
      if (dr.swing && !sliding) {
        const sw = solids.filter((o) => (o.z || 0) < 2000 && hitsSwing(o, dr.swing));
        check(...tag, `${dr.name}门扇扫掠范围内无实体`, sw.length === 0, sw.map((o) => o.name).join('、'));
      }
    }
    const blocked = [];
    for (const it of mine.filter((r) => r.part.access)) {
      const zone = accessZone({ ...it, access: it.part.access });
      for (const o of solids) if (o.id !== it.id && !related(it, o) && overlap3(zone, o)) blocked.push(`${it.name}前被${o.name}占用`);
    }
    if (mine.some((r) => r.part.access)) check(...tag, '柜门前净空', blocked.length === 0, blocked.join('、'));
    // 床位数：主卧任何状态 ≥ 2；卧室 B 父母来住 ≥ 2、平时为 0（平时不是一间空客房）
    const beds = mine.filter(active), sleeps = beds.reduce((n, b) => n + b.part.sleeps, 0);
    if (R === 'bedA') check(...tag, '主卧床位 ≥ 2', sleeps >= 2, `${sleeps} 个`);
    if (R === 'bedB' && st.key === 'guests') check(...tag, '父母来住床位 ≥ 2', sleeps >= 2, `${sleeps} 个`);
    if (R === 'bedB' && st.key === 'daily') check(...tag, '平时不留床（书房 / 和室）', sleeps === 0, `${sleeps} 个`);
    // 通行：从门内净空中心出发，净宽 ≥ 500 到达各目标与床边（双人床两条长边都要到得了）
    const door = HOUSE_DOORS.find((d) => d.room === R);
    // 障碍：离地 1 m 以下的实体；地台可行走；100 mm 及以下的地面件（蹲便、淋浴地面、踏板）可跨过
    const blockers = [...solids.filter((o) => (o.z || 0) < 1000 && !o.deck && o.h > 100), ...beds];
    const reach = roomReach(room, blockers, { x: door.x + door.w / 2, y: door.y + door.d / 2 });
    const miss = HOUSE_REACH.filter((t) => t.room === R && !reach(t.x, t.y)).map((t) => t.name);
    for (const b of beds) {
      const sides = bedSides(b);
      const ok = sides[b.part.sleeps >= 2 ? 'long' : 'all'].map(([n, pts]) => [n, pts.some(([x, y]) => reach(x, y))]);
      if (b.part.sleeps >= 2) for (const [n, v] of ok) { if (!v) miss.push(`${b.name}${n}侧`); }
      else if (!ok.some(([, v]) => v)) miss.push(`${b.name}`);
    }
    if (HOUSE_REACH.some((t) => t.room === R) || beds.length) check(...tag, '门到床边与操作位净宽 ≥ 500 可达', miss.length === 0, miss.length ? `不可达：${miss.join('、')}` : '');
  }
}
const metrics2 = {};
const keys2 = STATES2.map((s) => s.key);

for (const model of MODELS2.filter((m) => m.key !== 'current')) {
  for (const st of STATES2) {
    const posed = resolveState(model, st.key);
    const items = posed.filter((r) => !r.part.room); // 客厅构件；其他房间的构件在下面按房间检查
    const tag = [model.label, st.label];
    roomChecks(model, st, posed.filter((r) => r.part.room));

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
      const phys = [...at.filter((r) => r.mount !== 'ceiling' && !r.cover && !r.soft), ...FIXED3, ...houseFixed3(model)];
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

// ───────── 全屋外壳（house.js）：只建模不做设计，检查几何自洽、物件归位、门前净空与比例偏差 ─────────
function inPolyP(poly, px, py) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const polyArea = (p) => Math.abs(p.reduce((s, [x, y], i) => { const [px, py] = p[(i + p.length - 1) % p.length]; return s + px * y - x * py; }, 0)) / 2;
function rectInPoly(poly, r) {
  for (let x = r.x + 1; x <= r.x + r.w - 1; x += Math.min(CELL, Math.max(1, r.w - 2))) for (const y of [r.y + 1, r.y + r.d - 1]) if (!inPolyP(poly, x, y)) return false;
  for (let y = r.y + 1; y <= r.y + r.d - 1; y += Math.min(CELL, Math.max(1, r.d - 2))) for (const x of [r.x + 1, r.x + r.w - 1]) if (!inPolyP(poly, x, y)) return false;
  return true;
}
// 客厅墙体矩形：与两页 buildShell 同一算法（沿各边向外推 WALL_T，外凸角补块）
const outwardN = (x1, y1, x2, y2) => {
  let nx = y2 - y1, ny = -(x2 - x1);
  const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  if (inPoly((x1 + x2) / 2 + nx * 50, (y1 + y2) / 2 + ny * 50)) { nx = -nx; ny = -ny; }
  return [nx, ny];
};
const livingWalls = [];
ROOM.forEach(([x1, y1], i) => {
  const [x2, y2] = ROOM[(i + 1) % ROOM.length];
  const [nx, ny] = outwardN(x1, y1, x2, y2);
  const ax = [x1, x2, x1 + nx * WALL_T, x2 + nx * WALL_T], ay = [y1, y2, y1 + ny * WALL_T, y2 + ny * WALL_T];
  livingWalls.push({ x0: Math.min(...ax), x1: Math.max(...ax), y0: Math.min(...ay), y1: Math.max(...ay), name: `客厅墙 ${i}` });
  const [qx, qy] = ROOM[(i + 2) % ROOM.length];
  const n2 = outwardN(x2, y2, qx, qy);
  const cxx = x2 + ((nx + n2[0]) * WALL_T) / 2, cyy = y2 + ((ny + n2[1]) * WALL_T) / 2;
  // 共线的相邻边也会生成补块（凸出墙外皮 60 mm）；这里记下来供封闭性检查，但不参与重叠判断（目前唯一一处正好落在卧室 A 东墙里，渲染上不产生共面）
  if (!inPoly(cxx, cyy)) livingWalls.push({ ...{ x0: cxx - WALL_T / 2, x1: cxx + WALL_T / 2, y0: cyy - WALL_T / 2, y1: cyy + WALL_T / 2 }, name: `客厅墙角 ${i + 1}`, collinear: nx === n2[0] && ny === n2[1] });
});
const ovl2 = (a, b) => a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
const polys = [{ name: '客厅', poly: ROOM }, ...HOUSE_ROOMS.map((r) => ({ name: r.name, poly: r.poly }))];
{
  const H = '全屋', S = '外壳';
  // 1 房间轮廓互不重叠（25 mm 栅格）
  const dup = new Set();
  for (let x = -6000; x <= 5500; x += CELL) for (let y = -6500; y <= 9200; y += CELL) {
    const hit = polys.filter((p) => inPolyP(p.poly, x + 0.5, y + 0.5));
    if (hit.length > 1) dup.add(hit.map((p) => p.name).join('×'));
  }
  check(H, S, '房间轮廓互不重叠（含客厅）', dup.size === 0, [...dup].join('、'));
  // 2 墙段（含客厅墙）不侵入任何房间；新墙段之间、新墙与客厅墙之间不重叠（重叠面会闪烁）
  const walls = wallBoxes().filter((w) => !w.glass && !w.cap);
  const intrude = [];
  const housePolys = polys.slice(1);
  for (const w of [...walls.map((q) => ({ ...q, name: `墙段 ${q.wall}` })), ...livingWalls.map((l) => ({ ...l, others: true }))])
    for (let x = w.x0 + 5; x < w.x1; x += 20) for (let y = w.y0 + 5; y < w.y1; y += 20) {
      const p = (w.others ? housePolys : polys).find((q) => inPolyP(q.poly, x, y));
      if (p) { intrude.push(`${w.name}侵入${p.name}`); x = Infinity; break; }
    }
  check(H, S, '墙体不侵入房间（含客厅墙）', intrude.length === 0, [...new Set(intrude)].join('、'));
  const clash = [];
  for (const w of walls) for (const l of livingWalls.filter((q) => !q.collinear)) if (ovl2(w, l)) clash.push(`墙段 ${w.wall}×${l.name}`);
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) {
    const a = walls[i], b = walls[j];
    const sameRow = a.wall === b.wall && (a.z1 <= b.z0 || b.z1 <= a.z0); // 同一墙段按窗洞拆成的上下块
    if (!sameRow && ovl2(a, b)) clash.push(`墙段 ${a.wall}×墙段 ${b.wall}`);
  }
  check(H, S, '墙段互不重叠、不与客厅墙重叠', clash.length === 0, [...new Set(clash)].slice(0, 6).join('、'));
  // 2b 房间封闭：轮廓每条边外侧 60 mm 的采样点都落在墙段平面里（新墙段含窗洞，窗也算封闭；客厅墙的平面矩形覆盖门洞）
  const leak = [];
  const allWalls = [...HOUSE_WALLS, ...livingWalls];
  for (const r of HOUSE_ROOMS) r.poly.forEach(([x1, y1], i) => {
    const [x2, y2] = r.poly[(i + 1) % r.poly.length];
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    let nx = uy, ny = -ux;
    if (inPolyP(r.poly, (x1 + x2) / 2 + nx * 30, (y1 + y2) / 2 + ny * 30)) { nx = -nx; ny = -ny; }
    for (let s = 70; s < L - 70; s += 50) {
      const px = x1 + ux * s + nx * 60, py = y1 + uy * s + ny * 60;
      if (!allWalls.some((w) => px >= w.x0 && px <= w.x1 && py >= w.y0 && py <= w.y1)) { leak.push(`${r.name} 边 ${i}（${Math.round(px)}, ${Math.round(py)}）`); break; }
    }
  });
  check(H, S, '房间四周封闭（墙体无缺口）', leak.length === 0, leak.join('、'));
  // 3 标注面积比例：五个房间的偏差应落在同一区间（比例系统偏差），离群说明读错
  for (const r of HOUSE_ROOMS) {
    const dev = polyArea(r.poly) / 1e6 / r.area - 1;
    check(H, r.name, '图面面积与标注面积偏差在 +8%–+20%', dev >= 0.08 && dev <= 0.2, `图面 ${(polyArea(r.poly) / 1e6).toFixed(1)} ㎡，标注 ${r.area} ㎡，偏差 ${dev >= 0 ? '+' : ''}${Math.round(dev * 100)}%`);
  }
  // 4 物件在所属房间内；同房间实体互不重叠（按含上一任住户家具的最满情况）
  const byRoom = new Map(HOUSE_ROOMS.map((r) => [r.id, r]));
  for (const r of HOUSE_ROOMS) {
    const items = HOUSE_ITEMS.filter((it) => it.room === r.id);
    const out = items.filter((it) => !rectInPoly(r.poly, it));
    check(H, r.name, '物件在房间内', out.length === 0, out.map((it) => it.name).join('、'));
    const hits = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlap3(items[i], items[j])) hits.push(`${items[i].name}×${items[j].name}`);
    check(H, r.name, '物件互不重叠', hits.length === 0, hits.join('、'));
  }
  const orphan = HOUSE_ITEMS.filter((it) => !byRoom.has(it.room));
  check(H, S, '物件都归属已定义的房间', orphan.length === 0, orphan.map((it) => it.name).join('、'));
  // 5 门洞内侧 600 净空：净空矩形在房间内、对准客厅墙上的门洞、且没有 2 m 以下的物件
  for (const dr of HOUSE_DOORS) {
    const room = byRoom.get(dr.room);
    const op = OPENINGS.find((o) => o.name === dr.name);
    const vertical = op && ROOM[op.edge][0] === ROOM[(op.edge + 1) % ROOM.length][0];
    const span = vertical ? [dr.y, dr.y + dr.d] : [dr.x, dr.x + dr.w];
    const cover = op ? Math.max(0, Math.min(span[1], op.to) - Math.max(span[0], op.from)) / (op.to - op.from) : 0;
    // 净空矩形必须贴着门洞所在墙的房间一侧（墙面 = 客厅轮廓边 + 外法向 × 墙厚）
    let gap = Infinity;
    if (op) {
      const [ex1, ey1] = ROOM[op.edge], [ex2, ey2] = ROOM[(op.edge + 1) % ROOM.length];
      const [nx, ny] = outwardN(ex1, ey1, ex2, ey2);
      gap = vertical ? Math.min(Math.abs(dr.x - (ex1 + nx * WALL_T)), Math.abs(dr.x + dr.w - (ex1 + nx * WALL_T)))
        : Math.min(Math.abs(dr.y - (ey1 + ny * WALL_T)), Math.abs(dr.y + dr.d - (ey1 + ny * WALL_T)));
    }
    const block = HOUSE_ITEMS.filter((it) => it.room === dr.room && (it.z || 0) < 2000 && overlap(it, dr));
    check(H, dr.name, '门内 600 净空无遮挡、贴着并对准门洞', rectInPoly(room.poly, dr) && cover >= 0.98 && gap <= 10 && block.length === 0,
      `对准 ${Math.round(cover * 100)}%，离墙面 ${Math.round(gap)} mm${block.length ? '；挡门：' + block.map((it) => it.name).join('、') : ''}`);
  }
  // 5b 方案声明替换的固定件必须存在（防止拼错名称后旧件与新件叠在一起）
  for (const m of MODELS2.filter((x) => x.replaces)) {
    const missing = m.replaces.filter((k) => !HOUSE_ITEMS.some((it) => `${it.room}/${it.name}` === k));
    check(H, m.label, '替换的固定件都存在', missing.length === 0, missing.join('、'));
  }
  // 6 上一任住户的家具只出现在「现状」
  for (const m of [...MODELS, ...MODELS2]) {
    const prior = houseItems(m.key).filter((it) => it.kind === 'prior').length;
    check(H, m.label, m.key === 'current' ? '现状带上一任住户家具' : '方案不含上一任住户家具', m.key === 'current' ? prior > 0 : prior === 0, `${prior} 件`);
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
