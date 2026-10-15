/**
 * 拼贴板页的计算：颜色（CIELAB、CIEDE2000、色板覆盖）与平面几何（在房间内、重叠、门扇、通行）。
 * 检查脚本与页面构建共用，页面上显示的色差和检查用的是同一个函数。
 */

/* ---------------- 颜色 ---------------- */

export function hexToLab(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = v.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = lin;
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [X, Y, Z].map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export const chroma = ([, a, b]) => Math.hypot(a, b);

/** CIEDE2000（Sharma 2005 的实现步骤）。 */
export function deltaE00(l1, l2) {
  const [L1, a1, b1] = l1;
  const [L2, a2, b2] = l2;
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h = (b, a) => {
    if (a === 0 && b === 0) return 0;
    const t = Math.atan2(b, a) / rad;
    return t >= 0 ? t : t + 360;
  };
  const h1p = h(b1, a1p);
  const h2p = h(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lmp = (L1 + L2) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hmp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hmp = (h1p + h2p) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hmp - 30) * rad) + 0.24 * Math.cos(2 * hmp * rad) + 0.32 * Math.cos((3 * hmp + 6) * rad) - 0.2 * Math.cos((4 * hmp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hmp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lmp - 50) ** 2) / Math.sqrt(20 + (Lmp - 50) ** 2);
  const Sc = 1 + 0.045 * Cmp;
  const Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

/** 方案色板里的全部颜色（主色、点缀色，加上该方案保留的现状硬装主色）。 */
export function schemeColours(scheme, crops, retained) {
  const list = [...scheme.palette.main.map((c) => ({ ...c, role: 'main' })), ...scheme.palette.accent.map((c) => ({ ...c, role: 'accent' }))];
  for (const r of retained) {
    if (!scheme.retained[r.id]?.keep) continue;
    const top = crops[r.swatch].palette[0];
    list.push({ name: r.name, hex: top.hex, role: 'kept' });
  }
  return list.map((c) => ({ ...c, lab: hexToLab(c.hex) }));
}

/** 一块裁切的主色里，有多少面积是中性色或落在色板 ΔE 阈值内。 */
export function cropCover(crop, colours, rules) {
  let total = 0;
  let hit = 0;
  const detail = [];
  for (const p of crop.palette) {
    total += p.share;
    const lab = p.lab;
    const neutral = chroma(lab) <= rules.neutralChroma;
    let best = Infinity;
    let near = null;
    for (const c of colours) {
      const d = deltaE00(lab, c.lab);
      if (d < best) [best, near] = [d, c.name];
    }
    const ok = neutral || best <= rules.deltaE;
    if (ok) hit += p.share;
    detail.push({ hex: p.hex, share: p.share, neutral, near, dE: Math.round(best * 10) / 10, ok });
  }
  return { cover: total ? hit / total : 0, detail };
}

/** 现状硬装放在某方案里：最接近的色板颜色与色差；large 只和主色比。 */
export function retainedFit(item, scheme, crops, rules) {
  const top = crops[item.swatch].palette[0];
  const lab = hexToLab(top.hex);
  if (chroma(lab) <= rules.neutralChroma) return { neutral: true, hex: top.hex, dE: 0, near: '中性色', fits: true };
  const pool = item.large ? scheme.palette.main : [...scheme.palette.main, ...scheme.palette.accent];
  let best = Infinity;
  let near = null;
  for (const c of pool) {
    const d = deltaE00(lab, hexToLab(c.hex));
    if (d < best) [best, near] = [d, c.name];
  }
  return { neutral: false, hex: top.hex, dE: Math.round(best * 10) / 10, near, fits: best <= rules.deltaE };
}

/* ---------------- 平面几何 ---------------- */

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

export function rectInPoly(r, poly, inset = 12) {
  const pts = [
    [r.x + r.w / 2, r.y + r.d / 2],
    [r.x + inset, r.y + inset],
    [r.x + r.w - inset, r.y + inset],
    [r.x + r.w - inset, r.y + r.d - inset],
    [r.x + inset, r.y + r.d - inset],
  ];
  return pts.every(([x, y]) => pointInPoly(x, y, poly));
}

export function accessRect(p) {
  if (!p.access) return null;
  const { side, depth } = p.access;
  if (side === 'n') return { x: p.x, y: p.y - depth, w: p.w, d: depth };
  if (side === 's') return { x: p.x, y: p.y + p.d, w: p.w, d: depth };
  if (side === 'w') return { x: p.x - depth, y: p.y, w: depth, d: p.d };
  return { x: p.x + p.w, y: p.y, w: depth, d: p.d };
}

/** 平开门的门扇扫掠：门轴 j[1]，半径为门洞宽，落在门所服务房间的一侧。返回圆心、半径与象限方向。 */
export function doorSweep(door, poly) {
  if (door.kind !== 'swing') return null;
  if (poly && !doorZone(door, poly)) return null;
  if (poly) {
    const z = doorZone(door, poly);
    const intoRoom = door.axis === 'h' ? (z.y < door.w[0] ? -1 : 1) : z.x < door.w[0] ? -1 : 1;
    if (intoRoom !== door.into) return null;
  }
  const face = door.into < 0 ? door.w[0] : door.w[1];
  const hinge = door.axis === 'h' ? [door.j[1], face] : [face, door.j[1]];
  const along = -1; // 门扇从门轴扫向 j[0]
  return door.axis === 'h'
    ? { cx: hinge[0], cy: hinge[1], r: door.width, qx: along, qy: door.into }
    : { cx: hinge[0], cy: hinge[1], r: door.width, qx: door.into, qy: along };
}

/** 矩形是否压进门扇扫掠的四分之一圆。 */
export function hitsSweep(rect, s) {
  const x0 = s.qx > 0 ? s.cx : s.cx - s.r;
  const x1 = s.qx > 0 ? s.cx + s.r : s.cx;
  const y0 = s.qy > 0 ? s.cy : s.cy - s.r;
  const y1 = s.qy > 0 ? s.cy + s.r : s.cy;
  const ix0 = Math.max(rect.x, x0);
  const ix1 = Math.min(rect.x + rect.w, x1);
  const iy0 = Math.max(rect.y, y0);
  const iy1 = Math.min(rect.y + rect.d, y1);
  if (ix0 >= ix1 || iy0 >= iy1) return false;
  const nx = Math.min(Math.max(s.cx, ix0), ix1);
  const ny = Math.min(Math.max(s.cy, iy0), iy1);
  return Math.hypot(nx - s.cx, ny - s.cy) < s.r;
}

/** 门在某个房间一侧 depth 深的落地净空；门不通向这个房间时返回 null。 */
export function doorZone(door, poly, depth = 600) {
  const [j0, j1] = door.j;
  const [w0, w1] = door.w;
  const cands =
    door.axis === 'h'
      ? [{ x: j0, y: w0 - depth, w: j1 - j0, d: depth }, { x: j0, y: w1, w: j1 - j0, d: depth }]
      : [{ x: w0 - depth, y: j0, w: depth, d: j1 - j0 }, { x: w1, y: j0, w: depth, d: j1 - j0 }];
  return cands.find((r) => pointInPoly(r.x + r.w / 2, r.y + r.d / 2, poly)) ?? null;
}

/** 门洞中线往房间里走 offset 的一点，作通行检查的起点。 */
export function doorInside(door, poly, offset = 350) {
  const z = doorZone(door, poly, offset * 2);
  return z ? [z.x + z.w / 2, z.y + z.d / 2] : null;
}

/** 床某条长边外侧 depth 深的条带里，没被占用、且在房间内的长度占比。 */
export function sideFree(bed, side, blocks, poly, depth) {
  const strip =
    side === 'n' ? { x: bed.x, y: bed.y - depth, w: bed.w, d: depth }
      : side === 's' ? { x: bed.x, y: bed.y + bed.d, w: bed.w, d: depth }
        : side === 'w' ? { x: bed.x - depth, y: bed.y, w: depth, d: bed.d }
          : { x: bed.x + bed.w, y: bed.y, w: depth, d: bed.d };
  const horizontal = side === 'n' || side === 's';
  const len = horizontal ? strip.w : strip.d;
  const step = 25;
  let free = 0;
  for (let t = step / 2; t < len; t += step) {
    const slice = horizontal ? { x: strip.x + t - step / 2, y: strip.y, w: step, d: strip.d } : { x: strip.x, y: strip.y + t - step / 2, w: strip.w, d: step };
    if (!rectInPoly(slice, poly, 2)) continue;
    if (blocks.some((b) => overlap(slice, b))) continue;
    free += step;
  }
  return free / len;
}

/** 方形人体在平面上从起点出发能到达的格点。格点步长 step，人体按 size − step 计，抵消格点量化，
 *  这样恰好 size 宽的缝也能被找到。 */
export function walk(start, poly, blocks, size, step = 10) {
  const h = (size - step) / 2;
  const stand = (x, y) => {
    const body = { x: x - h, y: y - h, w: 2 * h, d: 2 * h };
    return rectInPoly(body, poly, 1) && !blocks.some((b) => overlap(body, b));
  };
  const seen = new Set();
  const out = [];
  const sx = Math.round(start[0] / step) * step;
  const sy = Math.round(start[1] / step) * step;
  if (!stand(sx, sy)) return { ok: false, cells: [] };
  const q = [[sx, sy]];
  seen.add(`${sx},${sy}`);
  while (q.length) {
    const [x, y] = q.pop();
    out.push([x, y]);
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (stand(nx, ny)) q.push([nx, ny]);
    }
  }
  return { ok: true, cells: out };
}

export function reaches(cells, rect) {
  return cells.some(([x, y]) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.d);
}
