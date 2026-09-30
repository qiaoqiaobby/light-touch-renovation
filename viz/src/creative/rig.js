// 机构数据层：由使用状态参数算出每个构件的位姿与平面投影（单位 mm，坐标同 geometry.js）
// 纯函数，不依赖 three；渲染、动画插值、校验、扫掠检查共用，保证画出来的就是校验过的
//
// 构件两类：
// - box（默认）：x/y/z 为西北下角，w 沿 x、d 沿 y、h 竖向；states 按状态覆盖；follow 跟随另一 box 的位移
// - hinge：绕水平轴转动的板。axis 为铰链线方向（'y' 平行南北，'x' 平行东西）；pivot 给出铰链线位置
//   （axis 'y' 用 pivot.x，axis 'x' 用 pivot.y）与高度 pivot.z；span 为铰链线覆盖范围；len 板长、thick 板厚；
//   dir 为 angle=0 时板伸出的方向（沿垂直于铰链线的水平轴，+1 或 −1）；angle 以度计，0 水平、90 竖直向上、−90 竖直向下；
//   板厚沿法向 n = (−dir·sin a, cos a) 生长。chain 指向另一块铰链板，本板铰接在其远端，此时 angle 为相对上一块板的夹角
//   （180 为对折、0 为展平）。链上的板按琴键铰链建模：铰链轴在上一块板顶面的远端棱线，本板厚度向自身法向的反方向生长，
//   因此对折时压在上一块板的顶面上，展平时与上一块板齐平。follow 跟随 box 位移。
// 时序：两个状态之间「先收后展」。相对 daily 处于展开状态的构件叫「展开件」；要收回的构件在前半段按 order 从大到小依次收回，
// 要展开的在后半段按 order 从小到大依次展开；只有一类时占满全程。搬动物品在最后 40% 淡入、最前 40% 淡出。
// 根板可用 side: −1 让板厚向法向反方向生长（例如铰链轴在门板外表面的上翻门）。
// 其他字段：only 仅在列出的状态出现；carried 为人搬动的物品（椅凳、座椅），原地淡入淡出，不做飞行路径，不参与扫掠检查；
// mount 同第一组（floor / wall / ceiling / on / deck / stowed）；dock 为可移动体块的定位点
// 路由：可移动体块（带 dock）要移动、而起止状态里有跟随它的铰链板是展开的，就先回到 daily 再去目标状态（先收后推）

const NUM = ['x', 'y', 'z', 'w', 'd', 'h', 'angle', 'len', 'count'];
const lerp = (a, b, t) => a + (b - a) * t;

export const present = (part, st) => !part.only || part.only.includes(st);
export const paramsOf = (part, st) => ({ ...part, ...(part.states && part.states[st]) });

// 在状态 A、B 之间按 t 插值出参数；只在一个状态出现的物品取其所在状态的参数
function mix(part, A, B, t) {
  const inA = present(part, A), inB = present(part, B);
  const pa = paramsOf(part, inA ? A : B), pb = paramsOf(part, inB ? B : A);
  const out = { ...(t < 0.5 ? pa : pb) };
  for (const k of NUM) if (typeof pa[k] === 'number' && typeof pb[k] === 'number') out[k] = lerp(pa[k], pb[k], t);
  if (pa.pivot && pb.pivot) {
    out.pivot = {};
    for (const k of Object.keys(pb.pivot)) out.pivot[k] = lerp(pa.pivot[k] ?? pb.pivot[k], pb.pivot[k], t);
  }
  return { p: out, inA, inB };
}

function hingePose(p, map, dx, dy) {
  let abs = p.angle, p0, z0;
  const side = p.side ?? (p.chain ? -1 : 1); // 厚度生长方向：根板默认沿 +n，链上的板沿 −n
  if (p.chain) {
    const c = map.get(p.chain);
    abs = c.abs + p.angle;
    p0 = c.p1 + c.n[0] * c.thick * c.side; // 铰链轴在上一块板顶面的远端棱线
    z0 = c.z1 + c.n[1] * c.thick * c.side;
  } else { p0 = p.axis === 'y' ? p.pivot.x + dx : p.pivot.y + dy; z0 = p.pivot.z; }
  const a = (abs * Math.PI) / 180;
  const u = [p.dir * Math.cos(a), Math.sin(a)];
  const n = [-p.dir * Math.sin(a), Math.cos(a)];
  const p1 = p0 + u[0] * p.len, z1 = z0 + u[1] * p.len;
  const t = p.thick * side;
  const cornersP = [p0, p1, p0 + n[0] * t, p1 + n[0] * t];
  const cornersZ = [z0, z1, z0 + n[1] * t, z1 + n[1] * t];
  const s0 = p.span[0] + (p.axis === 'y' ? dy : dx), s1 = p.span[1] + (p.axis === 'y' ? dy : dx);
  const pMin = Math.min(...cornersP), pMax = Math.max(...cornersP);
  const zMin = Math.min(...cornersZ), zMax = Math.max(...cornersZ);
  const box = p.axis === 'y'
    ? { x: pMin, w: pMax - pMin, y: s0, d: s1 - s0 }
    : { y: pMin, d: pMax - pMin, x: s0, w: s1 - s0 };
  return { ...box, z: zMin, h: zMax - zMin, p0, z0, p1, z1, u, n, s0, s1, abs, side, thick: p.thick };
}

const differs = (part, A, B) => {
  const pa = paramsOf(part, A), pb = paramsOf(part, B);
  if (NUM.some((k) => typeof pa[k] === 'number' && Math.abs(pa[k] - pb[k]) > 1e-6)) return true;
  return !!(pa.pivot && pb.pivot && Object.keys(pb.pivot).some((k) => Math.abs(pa.pivot[k] - pb.pivot[k]) > 1e-6));
};

// 「先收后展」：为 A→B 过渡中的每个构件分配局部时间窗 [t0, t1]
export function windows(model, A, B) {
  const win = new Map();
  const moving = model.parts.filter((p) => present(p, A) && present(p, B) && !p.carried && differs(p, A, B));
  const opening = moving.filter((p) => differs(p, 'daily', B));
  const closing = moving.filter((p) => !differs(p, 'daily', B));
  const spread = (parts, t0, t1, asc) => {
    const orders = [...new Set(parts.map((p) => p.order || 1))].sort((a, b) => (asc ? a - b : b - a));
    const step = (t1 - t0) / (orders.length || 1);
    for (const p of parts) { const i = orders.indexOf(p.order || 1); win.set(p.id, [t0 + i * step, t0 + (i + 1) * step]); }
  };
  spread(closing, 0, opening.length ? 0.5 : 1, false);
  spread(opening, closing.length ? 0.5 : 0, 1, true);
  for (const p of model.parts) {
    if (p.carried || present(p, A) !== present(p, B)) win.set(p.id, present(p, B) && !present(p, A) ? [0.6, 1] : [0, 0.4]);
  }
  return win;
}
const local = (t, w) => (w ? Math.min(1, Math.max(0, (t - w[0]) / (w[1] - w[0]))) : t);

// 计算模型全部构件在 A→B 过渡的 t 时刻的位姿；t=1 即状态 B
export function poseAll(model, A, B = A, t = 1) {
  const map = new Map();
  const out = [];
  const win = A === B ? null : windows(model, A, B);
  for (const part of model.parts) {
    const tl = win ? local(t, win.get(part.id)) : t;
    let { p, inA, inB } = mix(part, A, B, tl);
    let swap = null;
    if (part.carried && inA && inB && A !== B && differs(part, A, B)) {
      p = paramsOf(part, t < 0.5 ? A : B);
      swap = t < 0.5 ? Math.max(0, 1 - t / 0.4) : Math.max(0, (t - 0.6) / 0.4);
    }
    if (!inA && !inB) continue;
    let dx = 0, dy = 0;
    if (p.follow) { const f = map.get(p.follow); dx = f.dx; dy = f.dy; }
    let pose;
    if (p.kind === 'hinge') pose = hingePose(p, map, dx, dy);
    else pose = { x: p.x + dx, y: p.y + dy, z: p.z || 0, w: p.w, d: p.d, h: p.h, dx: p.x + dx - part.x, dy: p.y + dy - part.y };
    // 只在一端出现的物品：原地淡入淡出
    const opacity = swap !== null ? swap : inA === inB ? 1 : inB ? tl : 1 - tl;
    const r = { ...p, ...pose, id: part.id, part, opacity, mount: p.mount || 'floor' };
    map.set(part.id, r);
    out.push(r);
  }
  return out;
}

export const resolveState = (model, st) => poseAll(model, st, st, 1);

// 柜体正面的门板与两端端板（门板厚 18、板缝 3；只有带门板的柜体才有端板），坐标与 z 均为世界值
export function facadePanels(it) {
  const f = it.facade;
  if (!f || !f.doors || !f.doors.length) return [];
  const T = 18, g = 1.5, toe = f.toe || 0, z0 = it.z || 0;
  const alongY = f.face === 'w' || f.face === 'e';
  const front = (q0, q1) => (f.face === 'w' ? [it.x + q0, it.x + q1] : f.face === 'e' ? [it.x + it.w - q1, it.x + it.w - q0]
    : f.face === 'n' ? [it.y + q0, it.y + q1] : [it.y + it.d - q1, it.y + it.d - q0]);
  const box = (a0, a1, zz0, zz1, q0, q1, name) => {
    const [p0, p1] = front(q0, q1);
    return alongY ? { name, x: p0, w: p1 - p0, y: a0, d: a1 - a0, z: zz0, h: zz1 - zz0 }
      : { name, y: p0, d: p1 - p0, x: a0, w: a1 - a0, z: zz0, h: zz1 - zz0 };
  };
  const a0 = alongY ? it.y : it.x, a1 = a0 + (alongY ? it.d : it.w), depth = alongY ? it.w : it.d;
  const out = f.doors.map(([d0, d1, zz0, zz1]) => box(d0 + g, d1 - g, zz0 + g, zz1 - g, 0, T, `${it.name}门板`));
  out.push(box(a0, a0 + T, z0 + toe, z0 + it.h, 0, depth, `${it.name}端板`), box(a1 - T, a1, z0 + toe, z0 + it.h, 0, depth, `${it.name}端板`));
  return out;
}

// 状态切换的实际路径：返回若干段 [起, 止]；页面动画与校验共用
export function legsOf(model, A, B) {
  if (A === B || A === 'daily' || B === 'daily') return [[A, B]];
  for (const base of model.parts.filter((p) => p.dock && differs(p, A, B))) {
    const openFollower = model.parts.some((h) => h.kind === 'hinge' && h.follow === base.id
      && ((present(h, A) && differs(h, 'daily', A)) || (present(h, B) && differs(h, 'daily', B))));
    if (openFollower) return [[A, 'daily'], ['daily', B]];
  }
  return [[A, B]];
}

// 三维包围盒相交（接触不算）
export const overlap3 = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d &&
  (a.z || 0) < (b.z || 0) + b.h && (b.z || 0) < (a.z || 0) + a.h;

// 收起态地面空置率：主厅 x 0–3600、y 0–6270 内，未被落地实体占用的地面比例；
// 另算「含台面」口径：地台面上未被台上物体占用的部分也计为可用
export function freeRatio(items, hall = { x: 0, y: 0, w: 3600, d: 6270 }, cell = 50) {
  const floorSolids = items.filter((r) => r.mount === 'floor' && !r.cover && !r.soft && !r.deck);
  const decks = items.filter((r) => r.deck);
  const onDeck = items.filter((r) => r.mount === 'deck' && !r.cover);
  let total = 0, free = 0, usable = 0;
  const inside = (r, x, y) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d;
  for (let x = hall.x + cell / 2; x < hall.x + hall.w; x += cell) {
    for (let y = hall.y + cell / 2; y < hall.y + hall.d; y += cell) {
      total++;
      if (floorSolids.some((r) => inside(r, x, y))) continue;
      const deck = decks.find((r) => (r.rects || [r]).some((q) => inside(q, x, y)));
      if (!deck) { free++; usable++; continue; }
      if (!onDeck.some((r) => inside(r, x, y))) usable++;
    }
  }
  return { floor: free / total, usable: usable / total };
}
