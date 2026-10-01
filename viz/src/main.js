// 客厅微改三方案 3D 体块示意：渲染与交互
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ROOM, OPENINGS, MEDIA_WALL, FIXED, CEILING, WALL_T, SURVEY } from './geometry.js';
import { MODELS, STATES, resolveItems } from './schemes.js';
import { MATERIALS } from './materials.js';
import { HOUSE_ROOMS, HOUSE_ITEMS, HOUSE_NOTE, wallBoxes, itemBoxes, houseItems, houseBounds } from './house.js';

const M = 0.001; // mm → m
const $ = (id) => document.getElementById(id);
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const modelOf = (key) => MODELS.find((m) => m.key === key);

const ui = { model: 'current', state: 'daily', view: 'persp', light: 'day' };

// 光照参数（场景物理量，非 UI 视觉数值）
const LIGHT = {
  day: { hemi: 2.2, sun: 3.2, glow: 0 },
  exposure: 1.2,
  night: { hemi: 0.06, glow: 1.4, ceilWarm: 2.5, ceilCool: 7, lamp: 5, screen: 1.5, house: 0.2 },
  projection: 1.1,
};

// ───────── 基础设施 ─────────
const stage = $('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
  if (!renderer.getContext()) throw new Error('WebGL 上下文为空');
} catch (e) {
  showError(e);
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LIGHT.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
stage.insertBefore(labelRenderer.domElement, $('modelBar'));

const scene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
persp.position.set(9.0, 10.0, 8.5); // 从东南高处看，东墙与南墙剖切
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
ortho.position.set(1.55, 20, 3.5501); // 略偏南俯视，屏幕上方为北

// 俯视取景（米）：plan 以客厅为焦点（含北侧尺寸标签），house 装下全屋
const HB = houseBounds();
const FRAMES = {
  plan: { cx: 1.55, cz: 3.55, bw: 4.9, bh: 10.6 },
  house: { cx: (HB.x0 + HB.x1) / 2 * M, cz: (HB.y0 + HB.y1) / 2 * M, bw: (HB.x1 - HB.x0 + 400) * M, bh: (HB.y1 - HB.y0 + 800) * M },
};

const target = new THREE.Vector3(1.5, 0.6, 3.6);
const orbit = new OrbitControls(persp, renderer.domElement);
orbit.target.copy(target);
orbit.maxPolarAngle = THREE.MathUtils.degToRad(85);
orbit.minDistance = 2;
orbit.maxDistance = 25;
const plan = new OrbitControls(ortho, renderer.domElement);
plan.target.set(1.55, 0, 3.55);
plan.enableRotate = false;
plan.screenSpacePanning = true;
plan.enabled = false;
orbit.update(); // 构造时已按默认目标 (0,0,0) 调用过 update，改 target 后须重新对准
plan.update();
orbit.addEventListener('change', render);
plan.addEventListener('change', render);

// ───────── 材质 ─────────
const matCache = new Map();
function mat(key) {
  if (!matCache.has(key)) {
    const d = MATERIALS[key];
    if (!d) throw new Error(`未定义材质：${key}`);
    const m = new THREE.MeshStandardMaterial({ color: d.color, roughness: d.rough, metalness: 0 });
    if (d.opacity !== undefined) Object.assign(m, { transparent: true, opacity: d.opacity, depthWrite: false });
    if (d.emissive) { m.emissive = new THREE.Color(d.emissive); m.userData.glow = true; }
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// ───────── 几何工具 ─────────
function inPoly(px, py) {
  let inside = false;
  for (let i = 0, j = ROOM.length - 1; i < ROOM.length; j = i++) {
    const [xi, yi] = ROOM[i], [xj, yj] = ROOM[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// r 为米制矩形 {x0,x1,z0,z1}；y0 为底面高度
function slab(r, y0, h, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, h, r.z1 - r.z0), material);
  m.position.set((r.x0 + r.x1) / 2, y0 + h / 2, (r.z0 + r.z1) / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function cyl(rTop, rBot, h, material, x, y0, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 32), material);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function side(r, s, t) {
  if (s === 'e') return { ...r, x0: r.x1 - t };
  if (s === 'w') return { ...r, x1: r.x0 + t };
  if (s === 'n') return { ...r, z1: r.z0 + t };
  return { ...r, z0: r.z1 - t };
}
function inset(r, t) { return { x0: r.x0 + t, x1: r.x1 - t, z0: r.z0 + t, z1: r.z1 - t }; }
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const ENDS = { n: ['w', 'e'], s: ['w', 'e'], e: ['n', 's'], w: ['n', 's'] };

// ───────── 家具形体 ─────────
function legs(r, top, material, t = 0.04, pad = 0.03) {
  const g = [];
  for (const [sx, sz] of [['w', 'n'], ['e', 'n'], ['w', 's'], ['e', 's']]) {
    const a = side(side(inset(r, pad), sx, t), sz, t);
    g.push(slab(a, 0, top, material));
  }
  return g;
}

function buildItem(it) {
  const r = { x0: it.x * M, x1: (it.x + it.w) * M, z0: it.y * M, z1: (it.y + it.d) * M };
  const y0 = it.z * M, h = it.h * M;
  const A = mat(it.mat), B = mat(it.mat2 || it.mat);
  const g = new THREE.Group();
  const add = (...o) => o.flat().forEach((x) => g.add(x));
  const back = OPP[it.face || 's'];
  switch (it.shape) {
    case 'sofa': {
      add(slab(r, 0.08, 0.34, A));
      add(slab(inset(side(r, it.face, (it.face === 'e' || it.face === 'w' ? r.x1 - r.x0 : r.z1 - r.z0) - 0.2), 0.02), 0.42, 0.06, B));
      add(slab(side(r, back, 0.2), 0.42, h - 0.42, B));
      for (const e of ENDS[it.face]) add(slab(side(r, e, 0.15), 0.08, 0.52, A));
      add(legs(r, 0.08, mat('charcoal'), 0.04, 0.05));
      break;
    }
    case 'daybed': {
      add(slab(r, 0, h, A));
      add(slab(inset(r, 0.02), h, 0.15, B));
      add(slab(inset(side(r, back, 0.2), 0.03), h + 0.15, 0.35, B));
      break;
    }
    case 'chair': {
      const seat = inset(r, 0.02);
      add(slab(seat, 0.42, 0.04, A));
      add(slab(side(seat, back, 0.04), 0.46, h - 0.46, A));
      add(legs(seat, 0.42, B, 0.035, 0.01));
      break;
    }
    case 'lounge': {
      add(slab(inset(r, 0.03), 0.15, 0.25, A));
      add(slab(side(r, back, 0.18), 0.15, h - 0.15, A));
      for (const e of ENDS[it.face]) add(slab(side(r, e, 0.1), 0.15, 0.4, A));
      add(legs(r, 0.15, B, 0.035, 0.04));
      break;
    }
    case 'stool': {
      add(slab(r, h - 0.03, 0.03, A));
      add(legs(r, h - 0.03, A, 0.03, 0.02));
      break;
    }
    case 'table': {
      add(slab(r, h - 0.03, 0.03, A));
      add(legs(r, h - 0.03, B));
      break;
    }
    case 'walltable': {
      if (it.mount === 'wall') { add(slab(r, y0, h, A)); break; }
      add(slab(r, h - 0.03, 0.03, A));
      if (r.x1 - r.x0 > 0.7) add(legs(r, h - 0.03, A)); // 展开时的折叠支腿
      else add(slab(side(side(r, 'e', 0.03), 'n', 0.03), h - 0.35, 0.32, A), slab(side(side(r, 'e', 0.03), 's', 0.03), h - 0.35, 0.32, A));
      break;
    }
    case 'sidetable': {
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, rad = (r.x1 - r.x0) / 2;
      add(cyl(rad, rad, 0.03, A, cx, h - 0.03, cz), cyl(0.025, 0.025, h - 0.03, A, cx, 0, cz), cyl(rad * 0.6, rad * 0.6, 0.02, A, cx, 0, cz));
      break;
    }
    case 'shelf': {
      const long = r.x1 - r.x0 >= r.z1 - r.z0 ? ['w', 'e'] : ['n', 's'];
      for (const e of long) add(slab(side(r, e, 0.02), 0, h, A));
      const n = Math.max(2, Math.round(h / 0.33));
      for (let k = 0; k <= n; k++) add(slab(r, Math.min(k * (h / n), h - 0.02), 0.02, A));
      break;
    }
    case 'lamp': {
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, rad = (r.x1 - r.x0) / 2;
      if (it.mat2 === 'washi') {
        const shade = cyl(rad, rad, h - 0.1, B, cx, 0.08, cz);
        shade.castShadow = false; // 光源在灯罩内，灯罩不遮挡自身光线
        add(cyl(rad * 0.9, rad * 0.9, 0.08, A, cx, 0, cz), shade);
      } else {
        add(cyl(rad * 0.8, rad * 0.8, 0.02, A, cx, 0, cz), cyl(0.012, 0.012, h - 0.3, A, cx, 0.02, cz));
        const shade = cyl(rad * 0.75, rad, 0.3, B, cx, h - 0.3, cz);
        shade.castShadow = false;
        add(shade);
      }
      break;
    }
    case 'pendant': {
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, rad = (r.x1 - r.x0) / 2;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(rad, 32, 16), A);
      ball.position.set(cx, y0 + rad, cz);
      ball.receiveShadow = true;
      add(ball, cyl(0.004, 0.004, CEILING * M - y0 - 2 * rad, mat('charcoal'), cx, y0 + 2 * rad, cz));
      break;
    }
    case 'screen': {
      add(slab(r, y0, h, mat('projection')));
      break;
    }
    default: // box / cabinet / curtain / cushion / rug
      add(slab(r, y0, h, A));
  }
  g.userData.item = it;
  return g;
}

// 光源在物体上的位置
function lightPos(it) {
  const cx = (it.x + it.w / 2) * M, cz = (it.y + it.d / 2) * M;
  if (it.shape === 'pendant') return [cx, (it.z + it.h / 2) * M, cz];
  if (it.mat2 === 'washi') return [cx, it.h * 0.6 * M, cz];
  return [cx, (it.h - 150) * M, cz];
}

// ───────── 房屋外壳 ─────────
const walls = []; // { mesh, nx, nz, cx, cz, media }
function buildShell() {
  const shell = new THREE.Group();
  const shape = new THREE.Shape(ROOM.map(([x, y]) => new THREE.Vector2(x * M, -y * M)));
  const floorGeo = new THREE.ShapeGeometry(shape);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, mat('tile'));
  floor.receiveShadow = true;
  shell.add(floor);
  // 天花板：只参与投影不被相机看到，保证天光只经窗洞进入
  const ceilGeo = new THREE.ShapeGeometry(shape);
  ceilGeo.rotateX(-Math.PI / 2);
  ceilGeo.translate(0, CEILING * M, 0);
  const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  ceiling.castShadow = true;
  shell.add(ceiling);

  const T = WALL_T, H = CEILING;
  const addWall = (r, y0, h, material, n, media = false) => {
    const mesh = slab(r, y0 * M, h * M, material);
    if (material.transparent) mesh.castShadow = false; // 玻璃透光
    shell.add(mesh);
    walls.push({ mesh, nx: n[0], nz: n[1], cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2, media });
  };

  ROOM.forEach(([x1, y1], i) => {
    const [x2, y2] = ROOM[(i + 1) % ROOM.length];
    const horiz = y1 === y2;
    let nx = y2 - y1, ny = -(x2 - x1);
    const L = Math.hypot(nx, ny); nx /= L; ny /= L;
    if (inPoly((x1 + x2) / 2 + nx * 50, (y1 + y2) / 2 + ny * 50)) { nx = -nx; ny = -ny; }
    const a = Math.min(horiz ? x1 : y1, horiz ? x2 : y2), b = Math.max(horiz ? x1 : y1, horiz ? x2 : y2);
    const ops = OPENINGS.filter((o) => o.edge === i);
    const cuts = new Set([a, b, ...ops.flatMap((o) => [o.from, o.to])]);
    if (MEDIA_WALL.edge === i) { cuts.add(MEDIA_WALL.from); cuts.add(MEDIA_WALL.to); }
    const pts = [...cuts].filter((v) => v >= a && v <= b).sort((p, q) => p - q);
    // 沿墙区间 [s,e]、厚度方向偏移 [o0,o1] → 米制矩形
    const rect = (s, e, o0, o1) => horiz
      ? { x0: s * M, x1: e * M, z0: (y1 + Math.min(ny * o0, ny * o1)) * M, z1: (y1 + Math.max(ny * o0, ny * o1)) * M }
      : { x0: (x1 + Math.min(nx * o0, nx * o1)) * M, x1: (x1 + Math.max(nx * o0, nx * o1)) * M, z0: s * M, z1: e * M };
    for (let k = 0; k < pts.length - 1; k++) {
      const s = pts[k], e = pts[k + 1], mid = (s + e) / 2;
      const op = ops.find((o) => mid > o.from && mid < o.to);
      const media = MEDIA_WALL.edge === i && mid > MEDIA_WALL.from && mid < MEDIA_WALL.to;
      const wallMat = media ? 'MEDIA' : 'BASE';
      if (!op) { addWall(rect(s, e, 0, T), 0, H, placeholder(wallMat), [nx, ny], media); continue; }
      if (op.bottom > 0) addWall(rect(s, e, 0, T), 0, op.bottom, placeholder('BASE'), [nx, ny]);
      addWall(rect(s, e, 0, T), op.top, H - op.top, placeholder('BASE'), [nx, ny]);
      if (op.fill) addWall(rect(s, e, T / 2 - 20, T / 2 + 20), op.bottom, op.top - op.bottom, mat(op.fill), [nx, ny]);
    }
  });

  // 墙角补块
  ROOM.forEach(([x, y], i) => {
    const [px, py] = ROOM[(i - 1 + ROOM.length) % ROOM.length], [qx, qy] = ROOM[(i + 1) % ROOM.length];
    const n1 = outward(px, py, x, y), n2 = outward(x, y, qx, qy);
    const cx = x + (n1[0] + n2[0]) * T / 2, cy = y + (n1[1] + n2[1]) * T / 2;
    if (inPoly(cx, cy)) return;
    const r = { x0: (cx - T / 2) * M, x1: (cx + T / 2) * M, z0: (cy - T / 2) * M, z1: (cy + T / 2) * M };
    addWall(r, 0, H, placeholder('BASE'), [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2]);
  });

  for (const f of FIXED) shell.add(buildItem({ ...f, z: 0, shape: 'box' }));
  shell.add(buildHouse());
  return shell;
}

// ───────── 其他房间（house.js，只建模不做设计）─────────
// 不投射也不接收阴影：天光阴影范围只覆盖客厅，其他房间均匀受光，读作剖切模型
// 其他房间用独立的材质副本：夜间整体压暗，表示这些房间不点灯（不投影时客厅灯光会穿墙照亮它们）
const houseMats = new Map();
function houseMat(key) {
  if (!houseMats.has(key)) { const m = mat(key).clone(); m.userData.base = m.color.clone(); houseMats.set(key, m); }
  return houseMats.get(key);
}
function dimHouse(night) {
  for (const m of houseMats.values()) m.color.copy(m.userData.base).multiplyScalar(night ? LIGHT.night.house : 1);
}
function houseMesh(b) {
  const m = slab({ x0: b.x0 * M, x1: b.x1 * M, z0: b.y0 * M, z1: b.y1 * M }, b.z0 * M, (b.z1 - b.z0) * M, houseMat(b.key));
  m.castShadow = m.receiveShadow = false;
  return m;
}
function buildHouse() {
  const g = new THREE.Group();
  for (const r of HOUSE_ROOMS) {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(r.poly.map(([x, y]) => new THREE.Vector2(x * M, -y * M))));
    geo.rotateX(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, houseMat(r.wet ? 'wetTile' : 'tile')));
  }
  for (const b of wallBoxes()) g.add(houseMesh(b));
  for (const it of HOUSE_ITEMS.filter((i) => i.kind === 'fixed')) for (const b of itemBoxes(it)) g.add(houseMesh(b));
  return g;
}
function outward(x1, y1, x2, y2) {
  let nx = y2 - y1, ny = -(x2 - x1);
  const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  if (inPoly((x1 + x2) / 2 + nx * 50, (y1 + y2) / 2 + ny * 50)) { nx = -nx; ny = -ny; }
  return [nx, ny];
}
// 墙面材质随模型切换，先放占位，applyWalls 时替换
const WALL_SLOT = { BASE: new THREE.MeshStandardMaterial(), MEDIA: new THREE.MeshStandardMaterial() };
function placeholder(slot) { return WALL_SLOT[slot]; }
function applyWalls(model) {
  for (const [slot, key] of [['BASE', model.walls.base], ['MEDIA', model.walls.media]]) {
    const d = MATERIALS[key];
    WALL_SLOT[slot].color.set(d.color);
    WALL_SLOT[slot].roughness = d.rough;
  }
}

// 透视视图下隐藏朝向相机的墙（剖切娃娃屋）
function updateCutaway() {
  const cam = ui.view === 'persp' ? persp : ortho;
  for (const w of walls) {
    w.mesh.visible = ui.view !== 'persp' || (cam.position.x - w.cx) * w.nx + (cam.position.z - w.cz) * w.nz < 0;
  }
}

// ───────── 场景组装 ─────────
scene.add(buildShell());
let furniture = new THREE.Group();
let lights = new THREE.Group();
let labels = new THREE.Group();
scene.add(furniture, lights, labels);

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isLight) o.dispose(); // 释放阴影贴图
    if (o.isCSS2DObject) o.element.remove();
  });
  scene.remove(g);
}

function label(text, x, z, cls) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.set(x * M, 0.05, z * M);
  return o;
}

function rebuild() {
  const model = modelOf(ui.model);
  const items = resolveItems(model, ui.state);
  applyWalls(model);

  disposeGroup(furniture);
  furniture = new THREE.Group();
  for (const it of items) furniture.add(buildItem(it));
  for (const it of houseItems(model.key).filter((i) => i.kind === 'prior')) for (const b of itemBoxes(it)) furniture.add(houseMesh(b));
  // 吸顶灯只在夜间透视中显示：未绘制天花板，白天的灯盘会被读成悬浮物，俯视时会盖住家具
  for (const c of ui.light === 'night' && ui.view === 'persp' ? model.ceil : []) {
    furniture.add(cyl(0.2, 0.2, 0.03, mat(c.kind === 'cool' ? 'ledCool' : 'lampWarm'), c.x * M, CEILING * M - 0.03, c.y * M));
  }
  scene.add(furniture);

  disposeGroup(lights);
  lights = new THREE.Group();
  const night = ui.light === 'night';
  const hemi = new THREE.HemisphereLight('#e6edf3', '#bdb6aa', night ? LIGHT.night.hemi : LIGHT.day.hemi);
  lights.add(hemi);
  if (!night) {
    // 北向天光：从北窗外斜射入室内，仅经窗洞进入
    const sun = new THREE.DirectionalLight('#f2f6fb', LIGHT.day.sun);
    sun.position.set(1.8, 5, -5);
    sun.target.position.set(1.8, 0, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 6; // 北窗无直射光，阴影做柔，示意漫射天光
    lights.add(sun, sun.target);
  } else {
    for (const c of model.ceil) {
      const cool = c.kind === 'cool';
      const p = new THREE.PointLight(MATERIALS[cool ? 'ledCool' : 'lampWarm'].emissive, cool ? LIGHT.night.ceilCool : LIGHT.night.ceilWarm);
      p.position.set(c.x * M, CEILING * M - 0.15, c.y * M);
      lights.add(p);
    }
    for (const it of items.filter((i) => i.light)) {
      const p = new THREE.PointLight(MATERIALS[it.mat2 || it.mat].emissive, LIGHT.night.lamp);
      p.position.set(...lightPos(it));
      p.castShadow = true;
      p.shadow.mapSize.set(512, 512);
      p.shadow.bias = -0.002;
      lights.add(p);
    }
    const screen = items.find((i) => i.shape === 'screen');
    if (screen) {
      const p = new THREE.PointLight(MATERIALS.projection.emissive, LIGHT.night.screen);
      const nx = screen.w < 100 ? 1 : 0, nz = screen.w < 100 ? 0 : -1; // 墙面画面朝东，吊装幕布朝北
      p.position.set((screen.x + screen.w / 2) * M + nx * 0.6, (screen.z + screen.h / 2) * M, (screen.y + screen.d / 2) * M + nz * 0.6);
      lights.add(p);
    }
  }
  scene.add(lights);
  for (const m of matCache.values()) if (m.userData.glow) m.emissiveIntensity = night ? LIGHT.night.glow : LIGHT.day.glow;
  dimHouse(night);
  mat('projection').emissiveIntensity = LIGHT.projection;
  scene.background = new THREE.Color(cssVar(night ? '--c-canvas-night' : '--c-canvas-day'));

  disposeGroup(labels);
  labels = new THREE.Group();
  for (const z of model.zones) labels.add(label(z.name, z.x, z.y, 'zone-label'));
  // 房间名只在全屋俯视里出现：CSS2D 标签没有遮挡判断，透视里会压在客厅墙上
  if (ui.view === 'house') {
    for (const r of HOUSE_ROOMS) labels.add(label(r.name, r.label[0], r.label[1], 'room-label'));
    labels.add(label(HOUSE_NOTE, 3300, -3000, 'dim-label')); // 客厅北侧的空白处
  }
  if (ui.view === 'plan') {
    labels.add(label('东西净宽约 3.6 m（待复核）', 1800, -1050, 'dim-label'));
    labels.add(label('南北进深约 8.9 m（待复核）', 4350, 3800, 'dim-label'));
  }
  scene.add(labels);
  render();
}

function render() {
  updateCutaway();
  const cam = ui.view === 'persp' ? persp : ortho;
  renderer.render(scene, cam);
  labelRenderer.render(scene, cam);
}

// 切换俯视取景框：相机与平移目标回到该框中心，缩放复位
function frameOrtho() {
  const f = FRAMES[ui.view];
  ortho.position.set(f.cx, 20, f.cz + 0.0001);
  ortho.zoom = 1;
  plan.target.set(f.cx, 0, f.cz);
  plan.update();
  resize();
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
  // 俯视：按当前取景框适配
  const { bw, bh } = FRAMES[ui.view === 'house' ? 'house' : 'plan'], aspect = w / h;
  const halfH = Math.max(bh / 2, bw / 2 / aspect) * 1.08;
  Object.assign(ortho, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
  ortho.updateProjectionMatrix();
  render();
}

// ───────── 界面 ─────────
function segButtons(container, entries, onPick) {
  return entries.map((e) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = e.label;
    b.dataset.key = e.key;
    b.addEventListener('click', () => onPick(e.key));
    container.appendChild(b);
    return b;
  });
}
function syncButtons(buttons, current, disabled = false) {
  for (const b of buttons) {
    b.setAttribute('aria-pressed', String(b.dataset.key === current && !disabled));
    b.disabled = disabled;
    b.title = disabled ? '现状不区分使用状态' : '';
  }
}

const bars = {
  model: segButtons($('modelBar'), MODELS.map((m) => ({ key: m.key, label: m.label })), (k) => { ui.model = k; update(); }),
  view: segButtons($('viewBar'), [{ key: 'persp', label: '透视' }, { key: 'plan', label: '俯视' }, { key: 'house', label: '全屋' }], (k) => { ui.view = k; orbit.enabled = k === 'persp'; plan.enabled = k !== 'persp'; if (k !== 'persp') frameOrtho(); update(); }),
  light: segButtons($('lightBar'), [{ key: 'day', label: '昼' }, { key: 'night', label: '夜' }], (k) => { ui.light = k; update(); }),
  state: segButtons($('stateBar'), STATES, (k) => { ui.state = k; update(); }),
};
const stateNote = document.createElement('span');
stateNote.className = 'bar-note';
stateNote.textContent = '现状不区分使用状态';
$('stateBar').appendChild(stateNote);

function renderUI() {
  const model = modelOf(ui.model);
  const isCurrent = model.key === 'current';
  syncButtons(bars.model, ui.model);
  syncButtons(bars.view, ui.view);
  syncButtons(bars.light, ui.light);
  syncButtons(bars.state, ui.state, isCurrent);
  stateNote.hidden = !isCurrent;
  renderPanel(model);
}

function renderPanel(m) {
  let h = `<h1>${esc(m.title)}</h1>`;
  h += `<div class="caption">${esc(m.stamp || '体块示意，不是效果图；颜色代表材料')}</div>`;
  h += `<div class="notice caption"><strong>尺寸待现场复核</strong>　户型图的尺寸标注与面积比例冲突，现按面积与门宽推算。最需要实测的一个数：${esc(SURVEY.keyCheck)}。</div>`;
  h += `<p>${esc(m.summary)}</p>`;
  if (m.diagnosis) {
    h += '<h2>主要错配</h2><ul class="list">' + m.diagnosis.map((d) =>
      `<li><span class="dim">${esc(d.dim)}</span><span>${esc(d.text)}</span><span class="caption">诊断清单 ${esc(d.basis)}</span></li>`).join('') + '</ul>';
  }
  if (m.facts) {
    h += '<dl class="facts">' + m.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  }
  if (m.changes) {
    h += '<h2>改动清单</h2><ul class="list">' + m.changes.map((c) =>
      `<li><span class="lv lv-${esc(c.level)}">${esc(c.level)}</span><span>${esc(c.text)}</span><span class="caption">${esc(c.rev)} · 依据：${esc(c.basis)}</span></li>`).join('') + '</ul>';
  }
  if (m.palette) {
    h += '<h2>材料样板</h2><div class="swatches">' + m.palette.map((k) =>
      `<div class="swatch"><span class="chip" style="background:${esc(MATERIALS[k].color)}"></span><span class="caption">${esc(MATERIALS[k].name)}</span></div>`).join('') + '</div>';
  }
  h += '<p class="caption">「#」编号对应 promept.md 第八节诊断清单；L0–L3 为第七节改动层级。</p>';
  $('panel').innerHTML = h;
}

function update() {
  renderUI();
  rebuild();
}

// ───────── 出错兜底：SVG 俯视平面 ─────────
function showError(e) {
  $('loading').hidden = true;
  const box = $('error');
  box.hidden = false;
  $('gl').hidden = true;
  const items = resolveItems(modelOf(ui.model), 'daily').filter((i) => i.mount === 'floor');
  const pts = ROOM.map(([x, y]) => `${x},${y}`).join(' ');
  const rects = [...items, ...houseItems(ui.model).filter((i) => !i.z)].map((i) => `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.d}" fill="${MATERIALS[i.mat].color}" style="stroke:var(--c-text-2)" stroke-width="15"/>`).join('');
  const rooms = HOUSE_ROOMS.map((r) => `<polygon points="${r.poly.map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" style="stroke:var(--c-text-2)" stroke-width="30"/>`).join('');
  box.innerHTML = `<div>无法创建 WebGL 上下文，3D 模型不可用（${esc(e.message)}）。请换用支持 WebGL 的浏览器。下面是同一数据绘制的现状俯视平面。</div>`
    + `<svg viewBox="-6100 -6600 11700 15900" role="img" aria-label="现状全屋俯视平面">${rooms}<polygon points="${pts}" fill="none" style="stroke:var(--c-text)" stroke-width="30"/>${rects}</svg>`;
}

// ───────── 启动 ─────────
new ResizeObserver(resize).observe(stage);
update();
resize();
$('loading').hidden = true;
