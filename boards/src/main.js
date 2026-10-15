// 页面三：全屋风格方案拼贴板。数据由 boards/scripts/build.mjs 内联到 #data。
import { hexToLab, deltaE00, chroma, doorSweep, doorZone } from './metrics.mjs';

const D = JSON.parse(document.getElementById('data').textContent);
const SVGNS = 'http://www.w3.org/2000/svg';
const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'];
const state = { s: D.schemes[0].id, r: 'house', v: 'single', sc: 'daily' };

/* ---------- 工具 ---------- */

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : String(k));
  return e;
}
function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : String(k));
  return e;
}
const scheme = (id = state.s) => D.schemes.find((x) => x.id === id);
const boardRoom = (id) => D.boardRooms.find((r) => r.id === id);
const planRoom = (id) => D.rooms.find((r) => r.id === id);
const crop = (id) => D.crops[id];
const fmt = (n) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)} m` : `${Math.round(n)} mm`);

/* ---------- 物件、编号、颜色 ---------- */

function piecesFor(sch, roomId, scene = state.sc) {
  const br = boardRoom(roomId);
  if (br.plan === 'L') {
    return [...D.layouts[sch.layout][scene], ...(sch.rooms.L.pieces ?? []), ...(sch.rooms.E.pieces ?? [])];
  }
  return sch.rooms[roomId]?.pieces ?? [];
}

/** 房间内按拼贴顺序给物件编号；小件、材质块不编号。 */
function numbering(sch, roomId) {
  const map = new Map();
  for (const t of sch.rooms[roomId]?.tiles ?? []) if (t.piece && !map.has(t.piece)) map.set(t.piece, map.size + 1);
  return map;
}

/** 平面上物件的颜色：数据里指定的，或对应拼贴主色归到方案色板里最近的一个。 */
function fillOf(sch, piece, tileOf) {
  if (piece.fill) return piece.fill;
  const t = tileOf.get(piece.id);
  if (!t) return null;
  const pal = [...sch.palette.main, ...sch.palette.accent].map((c) => ({ ...c, lab: hexToLab(c.hex) }));
  const top = crop(t.crop).palette.find((p) => chroma(p.lab) > D.rules.neutralChroma);
  if (!top) return null;
  let best = null;
  let bd = Infinity;
  for (const c of pal) {
    const d = deltaE00(top.lab, c.lab);
    if (d < bd) [bd, best] = [d, c.hex];
  }
  return best;
}

/* ---------- 联动（签名元素） ---------- */

function link(root) {
  const on = (id, v) => root.querySelectorAll(`[data-piece="${CSS.escape(id)}"]`).forEach((n) => n.classList.toggle('on', v));
  root.querySelectorAll('[data-piece]').forEach((n) => {
    const id = n.getAttribute('data-piece');
    for (const [ev, v] of [['mouseenter', true], ['mouseleave', false], ['focus', true], ['blur', false]]) n.addEventListener(ev, () => on(id, v));
  });
}

/* ---------- 平面 ---------- */

function bbox(polys, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

function plan(sch, roomId, { mini = false } = {}) {
  const br = boardRoom(roomId);
  const rooms = roomId === 'house' ? D.rooms : [planRoom(br.plan)];
  const view = br.view ?? bbox(rooms.map((r) => r.poly), roomId === 'house' ? 300 : 420);
  const [vx0, vy0, vx1, vy1] = view;
  const svg = s('svg', { viewBox: `${vx0} ${vy0} ${vx1 - vx0} ${vy1 - vy0}`, role: 'img', 'aria-label': `${br.name}平面，${sch.name}` });
  const defs = s('defs');
  const pat = s('pattern', { id: 'hatch', width: 80, height: 80, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { class: 'hatch-bg', width: 80, height: 80 }), s('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 80, 'stroke-width': 14 }));
  defs.append(pat);
  svg.append(defs);
  const sw = (px) => ({ 'stroke-width': px, 'vector-effect': 'non-scaling-stroke' });

  for (const r of rooms) {
    svg.append(s('polygon', { class: 'room', points: r.poly.map((p) => p.join(',')).join(' '), ...sw(1.5) }));
    for (const g of r.glass ?? []) {
      const a = r.poly[g.edge];
      const b = r.poly[(g.edge + 1) % r.poly.length];
      svg.append(s('line', { class: 'glass', x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...sw(5) }));
    }
  }
  // 门
  for (const d of D.doors) {
    const served = rooms.find((r) => doorZone(d, r.poly));
    if (!served) continue;
    const swingRoom = d.kind === 'swing' ? rooms.find((r) => doorSweep(d, r.poly)) : null;
    if (swingRoom) {
      const { cx, cy, r, qx, qy } = doorSweep(d, swingRoom.poly);
      const open = d.axis === 'h' ? [cx, cy + qy * r] : [cx + qx * r, cy];
      const shut = d.axis === 'h' ? [cx + qx * r, cy] : [cx, cy + qy * r];
      const sweepFlag = (open[0] - cx) * (shut[1] - cy) - (open[1] - cy) * (shut[0] - cx) > 0 ? 1 : 0;
      svg.append(s('line', { class: 'door', x1: cx, y1: cy, x2: open[0], y2: open[1], ...sw(2) }));
      svg.append(s('path', { class: 'door door-arc', d: `M${open[0]},${open[1]} A${r},${r} 0 0 ${sweepFlag} ${shut[0]},${shut[1]}`, ...sw(1) }));
    } else {
      // 推拉门画粗线；向相邻房间开的平开门，这张图上只画门洞
      const [j0, j1] = d.j;
      const mid = (d.w[0] + d.w[1]) / 2;
      const p = d.axis === 'h' ? [[j0, mid], [j1, mid]] : [[mid, j0], [mid, j1]];
      svg.append(s('line', { class: 'door', x1: p[0][0], y1: p[0][1], x2: p[1][0], y2: p[1][1], ...sw(d.kind === 'slide' ? 4 : 2) }));
    }
  }
  // 现状固定件
  const planIds = rooms.map((r) => r.id);
  for (const f of D.fixed.filter((x) => planIds.includes(x.room))) {
    svg.append(s('rect', { class: `fixed ${f.kind === 'zone' ? 'zone' : ''}`, x: f.x, y: f.y, width: f.w, height: f.d, ...sw(1) }, s('title', {}, `现状：${f.name}（保留）`)));
  }
  // 新增物件
  const roomIds = roomId === 'house' ? D.boardRooms.filter((r) => r.id !== 'house').map((r) => r.id) : [roomId];
  const seen = new Set();
  const badges = [];
  for (const rid of roomIds) {
    if (roomId === 'house' && rid === 'E') continue;
    const nums = roomId === 'house' ? new Map() : numbering(sch, rid);
    const tileOf = new Map();
    for (const t of [...(sch.rooms[rid]?.tiles ?? []), ...(rid === 'L' ? sch.rooms.E.tiles : [])]) if (t.piece && !tileOf.has(t.piece)) tileOf.set(t.piece, t);
    for (const p of piecesFor(sch, rid, roomId === 'house' ? 'daily' : state.sc)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const mount = p.mount ?? 'floor';
      const fill = fillOf(sch, p, tileOf);
      const soft = p.cover || p.type === 'rug';
      const air = mount === 'wall' || mount === 'ceiling' || mount === 'on';
      const cls = ['piece', fill ? '' : 'plain', soft ? 'soft' : '', air ? 'air' : ''].join(' ');
      const title = s('title', {}, `${p.name}${p.w && p.d ? `，${p.w} × ${p.d}` : ''}${p.h ? ` × ${p.h}` : ''}（mm）${mount === 'ceiling' ? '，吊顶' : mount === 'wall' ? '，挂墙' : ''}`);
      const shape = mount === 'ceiling'
        ? s('circle', { class: cls, cx: p.x + p.w / 2, cy: p.y + p.d / 2, r: Math.max(p.w, p.d) / 2, 'data-piece': p.id, style: fill && !air ? `fill:${fill}` : null, ...sw(1.5) }, title)
        : s('rect', { class: cls, x: p.x, y: p.y, width: p.w, height: p.d, 'data-piece': p.id, style: fill && !air ? `fill:${fill}` : null, ...sw(1) }, title);
      svg.append(shape);
      if (nums.has(p.id)) badges.push([p, nums.get(p.id)]);
    }
  }
  for (const [p, n] of badges) {
    svg.append(s('g', { class: 'badge-g', 'data-piece': p.id }, s('circle', { cx: p.x + p.w / 2, cy: p.y + p.d / 2, 'data-r': 1, ...sw(1) }), s('text', { x: p.x + p.w / 2, y: p.y + p.d / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'data-fs': 1 }, n)));
  }
  // 关键间距
  if (!mini && (roomId === 'A' || roomId === 'B')) {
    for (const g of D.facts.schemes[sch.id].dims.filter((x) => x.room === roomId)) {
      const [x1, y1, x2, y2] = g.line;
      svg.append(s('line', { class: 'dim', x1, y1, x2, y2, ...sw(1) }));
      const horiz = Math.abs(y2 - y1) < 1;
      const t = s('text', { class: 'dim-t', x: (x1 + x2) / 2, y: (y1 + y2) / 2, 'text-anchor': 'middle', 'dominant-baseline': horiz ? 'auto' : 'central', 'data-fs': 1, 'data-dy': horiz ? -0.4 : 0, 'data-dx': horiz ? 0 : 0.6 }, `${g.text} ${g.value}`);
      if (!horiz) t.setAttribute('text-anchor', 'start');
      svg.append(t);
    }
  }
  // 房间名（全屋）
  if (roomId === 'house') {
    for (const br2 of D.boardRooms.filter((r) => r.plan && r.id !== 'E')) {
      const r = planRoom(br2.plan);
      const [x0, y0, x1, y1] = bbox([r.poly], 0);
      svg.append(s('text', { class: 'label', x: (x0 + x1) / 2, y: br2.plan === 'L' ? y0 + 900 : (y0 + y1) / 2, 'text-anchor': 'middle', 'data-fs': 1 }, br2.name));
    }
  }
  return svg;
}

/** 平面里的文字按显示宽度换算，保证不小于 12px。 */
function fitLabels(root = document) {
  root.querySelectorAll('.plan svg').forEach((svg) => {
    const vb = svg.viewBox.baseVal;
    const px = svg.getBoundingClientRect().width;
    if (!px) return;
    const unit = vb.width / px; // 毫米 / 像素
    const fs = 12 * unit;
    svg.querySelectorAll('[data-fs]').forEach((t) => {
      t.setAttribute('font-size', fs);
      if (t.matches('.dim-t, .label')) t.setAttribute('stroke-width', fs * 0.3);
      if (t.dataset.dy) t.setAttribute('dy', fs * Number(t.dataset.dy));
      if (t.dataset.dx) t.setAttribute('dx', fs * Number(t.dataset.dx));
    });
    svg.querySelectorAll('[data-r]').forEach((c) => c.setAttribute('r', fs * 0.95));
  });
}

/* ---------- 拼贴 ---------- */

function tiles(sch, roomId, { mini = false, limit = Infinity } = {}) {
  const nums = numbering(sch, roomId);
  const board = h('div', { class: `board${mini ? ' mini' : ''}` });
  for (const t of (sch.rooms[roomId]?.tiles ?? []).slice(0, limit)) {
    const c = crop(t.crop);
    const n = t.piece ? nums.get(t.piece) : null;
    const base = t.crop.startsWith('base-');
    board.append(
      h('figure', { class: 'tile', tabindex: mini ? null : 0, 'data-piece': t.piece ?? null },
        h('img', { src: c.src, width: c.w, height: c.h, alt: `${c.name}：${t.take}`, decoding: 'async' }),
        h('figcaption', {},
          h('span', { class: `badge${n ? '' : ' soft'}` }, n ?? t.use),
          h('b', {}, base ? `现状：${c.name}` : c.name),
          h('span', { class: 'take' }, `取：${t.take}`),
          h('span', { class: 'src' }, base ? '来自 VR 全景' : `买家秀图 ${c.img}`))));
  }
  return board;
}

/* ---------- 方案头、色板、清单 ---------- */

function swatch(name, hex, sub) {
  return h('li', { class: 'sw' }, h('i', { style: `background:${hex}`, 'aria-hidden': 'true' }), h('span', {}, name), h('small', {}, sub ?? hex));
}
function swatchImg(name, src, sub) {
  return h('li', { class: 'sw' }, h('img', { src, alt: '' }), h('span', {}, name), h('small', {}, sub));
}

function palette(sch) {
  const kept = D.retained.filter((r) => sch.retained[r.id]?.keep && !D.facts.schemes[sch.id].retained[r.id].neutral);
  return h('div', { class: 'palette' },
    h('div', { class: 'pgroup' }, h('span', { class: 'caption' }, `主色 ${sch.palette.main.length}`), h('ul', {}, sch.palette.main.map((c) => swatch(c.name, c.hex)))),
    h('div', { class: 'pgroup' }, h('span', { class: 'caption' }, `点缀 ${sch.palette.accent.length}`), h('ul', {}, sch.palette.accent.map((c) => swatch(c.name, c.hex)))),
    kept.length ? h('div', { class: 'pgroup' }, h('span', { class: 'caption' }, '原样保留的有色硬装'), h('ul', {}, kept.map((r) => swatchImg(r.name, crop(r.swatch).src, `ΔE ${D.facts.schemes[sch.id].retained[r.id].dE}`)))) : null,
    h('div', { class: 'pgroup' }, h('span', { class: 'caption' }, '不计入主色'), h('p', { class: 'caption' }, '白、灰、黑等中性色；地砖、白墙、吊顶、卧室白柜与地板都属于这一类')));
}

function head(sch) {
  const total = sch.mix.reduce((a, [, v]) => a + v, 0);
  return h('section', { class: 'head', 'aria-label': `${sch.name}方案概要` },
    h('div', { class: 'name-row' },
      h('h2', {}, sch.name),
      h('span', { class: 'chip' }, `客厅布局：${sch.layoutName}`),
      sch.control ? h('span', { class: 'chip strong' }, '对照方案') : null),
    h('p', { class: 'claim' }, sch.claim),
    h('dl', { class: 'facts' },
      h('dt', {}, '风格配比'),
      h('dd', {}, h('div', { class: 'mix' },
        h('div', { class: 'mix-bar', role: 'img', 'aria-label': sch.mix.map(([k, v]) => `${k} ${v}%`).join('，') }, sch.mix.map(([, v]) => h('span', { style: `width:${(v / total) * 100}%` }))),
        h('div', { class: 'mix-legend' }, sch.mix.map(([k, v]) => h('span', {}, `${k} ${v}%`))))),
      h('dt', {}, '统一'), h('dd', {}, sch.shared),
      h('dt', {}, '对比'), h('dd', {}, sch.contrast),
      h('dt', {}, '不用'), h('dd', {}, sch.exclude.length ? sch.exclude.join('、') : '无'),
      h('dt', {}, '代价'), h('dd', {}, sch.cost)),
    palette(sch));
}

const lv = (l) => h('span', { class: `lv ${l}` }, l);

function changes(list) {
  return h('div', { class: 'wrap-x' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, '层级'), h('th', {}, '改动'), h('th', {}, '可逆性'))),
    h('tbody', {}, list.map((c) => h('tr', {}, h('td', {}, lv(c.level)), h('td', {}, c.text), h('td', { class: 'num' }, c.rev))))));
}

function legend(extra) {
  return h('p', { class: 'legend caption' },
    h('span', { class: 'lg-new' }, '新增（颜色取自方案色板）'),
    h('span', { class: 'lg-fixed' }, '现状保留'),
    h('span', { class: 'lg-soft' }, '地毯、挂墙、吊顶'),
    extra);
}

/* ---------- 视图 ---------- */

function sceneBar() {
  return h('div', { class: 'seg', role: 'group', 'aria-label': '客厅使用状态' },
    D.scenes.map((sc) => h('button', { type: 'button', 'aria-pressed': String(state.sc === sc.id), onclick: () => set({ sc: sc.id }) }, sc.label)));
}

function roomSection(sch, roomId) {
  const br = boardRoom(roomId);
  const R = sch.rooms[roomId];
  const notes = [];
  if (['K', 'Bath'].includes(roomId)) notes.push('固定件位置按 VR 全景估计，待现场复核；厨卫不做通行检查');
  if (['A', 'B', 'C'].includes(roomId)) notes.push(`衣柜、飘窗台等现状固定件位置按 VR 全景换算，待现场复核`);
  if (br.plan === 'L') notes.push(`客厅坐标沿用户型三维的「${sch.layoutName}」，已通过 audit:plan`);
  return h('section', { class: 'room', 'aria-label': br.name },
    h('div', { class: 'room-head' }, h('h3', {}, br.name), h('span', { class: 'caption' }, br.role)),
    br.plan === 'L' ? sceneBar() : null,
    h('div', { class: 'room-grid' },
      tiles(sch, roomId),
      h('figure', { class: 'plan' }, plan(sch, roomId), legend(), notes.map((n) => h('p', { class: 'caption' }, n)))),
    changes(R.changes));
}

function retainedTable(sch) {
  const f = D.facts.schemes[sch.id].retained;
  return h('div', { class: 'wrap-x' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, '现状硬装'), h('th', {}, '本方案'), h('th', {}, '和方案色板的关系'))),
    h('tbody', {}, D.retained.map((r) => {
      const d = sch.retained[r.id];
      const x = f[r.id];
      const rel = x.neutral ? '中性色，任何方案都能留' : `最接近「${x.near}」，色差 ΔE ${x.dE}${x.fits ? '，可以原样保留' : `，超过 ${D.rules.deltaE}`}`;
      return h('tr', {},
        h('td', {}, h('span', { class: 'swatch-cell' }, h('img', { src: crop(r.swatch).src, alt: '' }), r.name)),
        h('td', {}, d.keep ? h('span', {}, lv('L0'), ' 保留', d.note ? `（${d.note}）` : '') : h('span', {}, lv(d.level), ` ${d.text}`)),
        h('td', { class: 'caption' }, rel));
    }))));
}

function levelCounts(sch, roomIds) {
  const n = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const id of roomIds) for (const c of sch.rooms[id].changes) n[c.level]++;
  return h('span', { class: 'counts' }, LEVELS.map((l) => h('span', {}, lv(l), ` ${n[l]}`)));
}

function houseView(sch) {
  const roomIds = D.boardRooms.filter((r) => r.id !== 'house').map((r) => r.id);
  return h('div', { class: 'house-grid' },
    h('figure', { class: 'plan' }, plan(sch, 'house'), legend(), h('p', { class: 'caption' }, '客厅显示日常状态。点上方房间名看每个房间的拼贴与编号。')),
    h('div', { class: 'stack' },
      h('section', { 'aria-label': '现状硬装取舍' }, h('h3', {}, '现状硬装：保留还是改'), retainedTable(sch)),
      h('section', { 'aria-label': '改动数量' }, h('h3', {}, '全屋改动条数'), levelCounts(sch, roomIds),
        h('p', { class: 'caption' }, 'L0 不花钱、随时可撤回；L2 是表面处理；L3 是定制柜等固定构件；L4 只作需专业评估的选项。')),
      h('section', { class: 'cards', 'aria-label': '各房间' }, roomIds.map((id) =>
        h('div', { class: 'card' }, h('h3', {}, boardRoom(id).name), h('span', { class: 'caption' }, boardRoom(id).role),
          tiles(sch, id, { mini: true, limit: 3 }),
          h('button', { type: 'button', class: 'link', onclick: () => set({ r: id }) }, `看${boardRoom(id).name}`))))));
}

function single() {
  const sch = scheme();
  return [head(sch), state.r === 'house' ? houseView(sch) : roomSection(sch, state.r)];
}

function compare() {
  const roomId = state.r;
  const br = boardRoom(roomId);
  const roomIds = roomId === 'house' ? D.boardRooms.filter((r) => r.id !== 'house').map((r) => r.id) : [roomId];
  return [
    h('div', { class: 'room-head' }, h('h2', {}, `并排比较 · ${br.name}`), br.plan === 'L' ? sceneBar() : null),
    h('div', { class: 'compare' }, D.schemes.map((sch) => {
      const kept = D.retained.filter((r) => sch.retained[r.id].keep).length;
      return h('section', { class: `col${sch.id === state.s ? ' cur' : ''}`, 'aria-label': sch.name },
        h('div', { class: 'name-row' }, h('h3', {}, sch.name), h('span', { class: 'chip' }, `布局：${sch.layoutName}`), sch.control ? h('span', { class: 'chip strong' }, '对照') : null),
        h('p', { class: 'caption' }, sch.mix.map(([k, v]) => `${k} ${v}%`).join(' · ')),
        roomId === 'house' ? null : tiles(sch, roomId, { mini: true, limit: 6 }),
        h('figure', { class: 'plan' }, plan(sch, roomId, { mini: true })),
        h('ul', { class: 'palette plain-list' }, [...sch.palette.main, ...sch.palette.accent].map((c) => swatch(c.name, c.hex))),
        h('p', {}, '改动 ', levelCounts(sch, roomIds)),
        roomId === 'house' ? h('p', { class: 'caption' }, `现状硬装原样保留 ${kept} / ${D.retained.length} 项`) : null,
        h('p', { class: 'caption' }, `代价：${sch.cost}`),
        h('button', { type: 'button', class: 'link', onclick: () => set({ s: sch.id, v: 'single' }) }, `看${sch.name}的${br.name}`));
    })),
  ];
}

/* ---------- 状态与渲染 ---------- */

function bars() {
  const mk = (bar, items, key) => {
    const el = document.getElementById(bar);
    el.replaceChildren(...items.map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(state[key] === id), onclick: () => set({ [key]: id }) }, label)));
  };
  mk('schemeBar', D.schemes.map((x) => [x.id, x.control ? `${x.name}（对照）` : x.name]), 's');
  mk('viewBar', [['single', '单个方案'], ['compare', '并排比较']], 'v');
  mk('roomBar', D.boardRooms.map((r) => [r.id, r.name]), 'r');
}

function set(patch) {
  Object.assign(state, patch);
  render();
  if (patch.r || patch.s || patch.v) window.scrollTo({ top: 0 });
}

function render() {
  bars();
  const main = document.getElementById('main');
  main.replaceChildren(...[state.v === 'single' ? single() : compare()].flat());
  link(main);
  requestAnimationFrame(() => fitLabels(main));
  history.replaceState(null, '', `#s=${state.s}&r=${state.r}&v=${state.v}&sc=${state.sc}`);
}

function init() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (D.schemes.some((x) => x.id === q.get('s'))) state.s = q.get('s');
  if (D.boardRooms.some((x) => x.id === q.get('r'))) state.r = q.get('r');
  if (['single', 'compare'].includes(q.get('v'))) state.v = q.get('v');
  if (D.scenes.some((x) => x.id === q.get('sc'))) state.sc = q.get('sc');
  document.getElementById('stamp').textContent = D.meta.date;
  document.getElementById('foot').replaceChildren(...D.meta.foot.map((t) => h('p', {}, t)));
  render();
  new ResizeObserver(() => fitLabels()).observe(document.body);
}

init();
