// 页面二：客厅创意三方案（墙 / 台 / 动）高精度 3D 示意与变形动画
// 几何一律来自 rig.js（与校验同源）；视觉数值来自 tokens.css 与 materials.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ROOM, OPENINGS, MEDIA_WALL, FIXED, CEILING, WALL_T, SURVEY } from '../geometry.js';
import { MODELS, STATES } from './schemes.js';
import { MATERIALS } from './materials.js';
import { poseAll, resolveState, freeRatio, present, legsOf } from './rig.js';
import { textureFor, worldUV } from './textures.js';
import { HOUSE_ROOMS, HOUSE_NOTE, CUT_H, wallBoxes, itemBoxes, houseItems, houseBounds } from '../house.js';
import { ROLES } from './rooms.js';

const M = 0.001;
const $ = (id) => document.getElementById(id);
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const modelOf = (key) => MODELS.find((m) => m.key === key);

const ui = { model: 's4', state: 'daily', view: 'persp', light: 'day', room: 'living' }; // room：透视相机对准的房间

// 光照物理量（场景参数，非 UI 视觉数值）
const LIGHT = {
  exposure: 1.05,
  day: { hemi: 0.9, sun: 2.6, env: 0.45, glow: 0 },
  night: { hemi: 0.03, env: 0.05, glow: 1.6, ceil: 1.1, lamp: 4, area: 5, screen: 1.2, house: 0.2 },
  projection: 1.1,
  aoBudgetMs: 100, // 单帧超过该值即关闭环境光遮蔽（计划第七节）
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
RectAreaLightUniformsLib.init();
renderer.localClippingEnabled = true; // 其他房间的构件按剖切高度截断

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
stage.insertBefore(labelRenderer.domElement, $('modelBar'));

const persp = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
// 各方案的默认视角：方案四、五从西南看（东墙立面朝西、地台西侧有抽屉与踢脚灯），现状与方案六从东南看
const VIEWS = {
  southwest: { pos: [-5.2, 8.8, 8.6], target: [2.0, 0.8, 3.4] },
  southeast: { pos: [8.6, 9.2, 8.8], target: [1.7, 0.7, 3.4] },
};
const VIEW_OF = { current: 'southeast', s4: 'southwest', s5: 'southwest', s6: 'southeast' };
persp.position.set(...VIEWS.southwest.pos);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
ortho.position.set(1.55, 20, 3.5501);
// 俯视取景（米）：plan 以客厅为焦点（含北侧尺寸标签），house 装下全屋
const HB = houseBounds();
const FRAMES = {
  plan: { cx: 1.55, cz: 3.55, bw: 4.9, bh: 10.6 },
  house: { cx: (HB.x0 + HB.x1) / 2 * M, cz: (HB.y0 + HB.y1) / 2 * M, bw: (HB.x1 - HB.x0 + 400) * M, bh: (HB.y1 - HB.y0 + 800) * M },
};
const orbit = new OrbitControls(persp, renderer.domElement);
orbit.target.set(...VIEWS.southwest.target);
orbit.maxPolarAngle = THREE.MathUtils.degToRad(85);
orbit.minDistance = 2;
orbit.maxDistance = 25;
const plan = new OrbitControls(ortho, renderer.domElement);
plan.target.set(1.55, 0, 3.55);
plan.enableRotate = false;
plan.screenSpacePanning = true;
plan.enabled = false;
orbit.update(); // 构造时已按默认目标调用过 update，改 target 后须重新对准
plan.update();
orbit.addEventListener('change', render);
plan.addEventListener('change', render);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
const renderPass = new RenderPass(scene, persp);
const gtao = new GTAOPass(scene, persp, 1, 1);
gtao.blendIntensity = 0.85;
gtao.updateGtaoMaterial({ radius: 0.35, distanceFallOff: 1, thickness: 1 });
composer.addPass(renderPass);
composer.addPass(gtao);
composer.addPass(new OutputPass());
let aoAllowed = true;

// ───────── 材质 ─────────
const matCache = new Map();
function mat(key) {
  if (matCache.has(key)) return matCache.get(key);
  const d = MATERIALS[key];
  if (!d) throw new Error(`未定义材质：${key}`);
  const p = { color: d.tex ? '#ffffff' : d.color, roughness: d.rough, metalness: d.metal || 0 };
  const m = d.sheen ? new THREE.MeshPhysicalMaterial({ ...p, sheen: d.sheen, sheenColor: new THREE.Color(d.color), sheenRoughness: 0.8 })
    : new THREE.MeshStandardMaterial(p);
  if (d.tex) { m.map = textureFor(key, d.tex, d.color); const bump = { tatami: 0.5, plaster: 0.15, yakisugi: 0.8 }[d.tex.kind]; if (bump) { m.bumpMap = m.map; m.bumpScale = bump; } }
  if (d.opacity !== undefined) Object.assign(m, { transparent: true, opacity: d.opacity, depthWrite: false });
  if (d.emissive) { m.emissive = new THREE.Color(d.emissive); m.userData.glow = true; }
  m.userData.key = key;
  matCache.set(key, m);
  return m;
}
const tileOf = (key) => (MATERIALS[key] && MATERIALS[key].tex ? MATERIALS[key].tex.tile * M : null);

// ───────── 几何工具 ─────────
function inPoly(px, py) {
  let inside = false;
  for (let i = 0, j = ROOM.length - 1; i < ROOM.length; j = i++) {
    const [xi, yi] = ROOM[i], [xj, yj] = ROOM[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 世界坐标（米）的包围盒建块；radius 为倒角（米）；world 为该块在世界中的中心，用于纹理连续
function block(x0, x1, y0, y1, z0, z1, key, radius = 0.003, world = null) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const geo = r > 0.0008 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const tile = tileOf(key);
  if (tile) worldUV(geo, tile, world ? [world[0] + c[0], world[1] + c[1], world[2] + c[2]] : c);
  const m = new THREE.Mesh(geo, mat(key));
  m.position.set(...c);
  m.castShadow = m.receiveShadow = !MATERIALS[key].emissive && MATERIALS[key].opacity === undefined;
  return m;
}

// 构件局部坐标：以构件西北下角为原点、单位 mm；px 沿 x，py 沿平面 y，pz 竖向
function makePiece(g, W, D) {
  return (px0, px1, py0, py1, pz0, pz1, key, radius = 3) =>
    g.add(block((px0 - W / 2) * M, (px1 - W / 2) * M, pz0 * M, pz1 * M, (py0 - D / 2) * M, (py1 - D / 2) * M, key, radius * M, g.userData.world));
}

const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
// 平面内某一侧的条带（局部 mm 矩形 [x0,x1,y0,y1]）
function strip(r, side, t) {
  const [x0, x1, y0, y1] = r;
  if (side === 'e') return [x1 - t, x1, y0, y1];
  if (side === 'w') return [x0, x0 + t, y0, y1];
  if (side === 'n') return [x0, x1, y0, y0 + t];
  return [x0, x1, y1 - t, y1];
}
const inset = ([x0, x1, y0, y1], t) => [x0 + t, x1 - t, y0 + t, y1 - t];
function legs4(P, r, top, key, t = 30, pad = 20) {
  for (const sx of ['w', 'e']) for (const sy of ['n', 's']) {
    const [a0, a1, b0, b1] = strip(strip(inset(r, pad), sx, t), sy, t);
    P(a0, a1, b0, b1, 0, top, key, 2);
  }
}

// ───────── 构件形体 ─────────
// 返回以 (中心 x, 底面, 中心 y) 为原点的组；尺寸为建模时的位姿尺寸，之后按比例缩放适配
function buildPart(pose) {
  const it = pose;
  const W = it.w, D = it.d, H = it.h;
  const g = new THREE.Group();
  g.userData.world = [(it.x + W / 2) * M, (it.z || 0) * M, (it.y + D / 2) * M];
  const P = makePiece(g, W, D);
  const A = it.mat, B = it.mat2 || it.mat;
  const all = [0, W, 0, D];
  const face = it.face || 's';
  if (it.noMesh) return g;
  switch (it.shape) {
    case 'panel': {
      // 铰链板：局部 X 沿板长、Y 沿板厚、Z 沿铰链线，原点在铰链轴
      const len = it.len * M, th = it.thick * M, span = (it.s1 - it.s0) * M;
      const m = block(0, len, 0, th, -span / 2, span / 2, A, 0.002);
      g.add(m);
      g.userData.hinge = true;
      break;
    }
    case 'bedpanel': {
      // 壁床板：局部 X 沿床长、Y 沿板厚（放平时向上）；下层 80 为床架（竖起时朝外，读作柜门），上层为床垫
      const len = it.len * M, th = it.thick * M, span = (it.s1 - it.s0) * M, f = 0.08;
      g.add(block(0, len, 0, f, -span / 2, span / 2, A, 0.003));
      g.add(block(0.02, len - 0.02, f, th, -span / 2 + 0.02, span / 2 - 0.02, B, 0.02));
      g.userData.hinge = true;
      break;
    }
    case 'cabinet': buildCabinet(g, P, it); break;
    case 'deck': {
      const geo = new THREE.BoxGeometry(W * M, H * M, D * M);
      worldUV(geo, tileOf(A), [(it.x + W / 2) * M, (it.z + H / 2) * M, (it.y + D / 2) * M]);
      const m = new THREE.Mesh(geo, [mat(B), mat(B), mat(A), mat('walnutIn'), mat(B), mat(B)]);
      m.position.set(0, (H / 2) * M, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      break;
    }
    case 'sofa': {
      // 低矮三模块沙发：底座 + 三块坐垫 + 三块靠垫，无扶手
      const along = face === 'n' || face === 's' ? 'x' : 'y';
      const slice = ([a0, a1, b0, b1], k, n = 3) => (along === 'x'
        ? [a0 + ((a1 - a0) * k) / n + 8, a0 + ((a1 - a0) * (k + 1)) / n - 8, b0, b1]
        : [a0, a1, b0 + ((b1 - b0) * k) / n + 8, b0 + ((b1 - b0) * (k + 1)) / n - 8]);
      const seatZone = strip(all, face, (along === 'x' ? D : W) - 200);
      const backZone = strip(all, OPP[face], 200);
      P(...inset(all, 30), 60, 380, A, 30);
      for (let k = 0; k < 3; k++) { P(...slice(seatZone, k), 380, 480, B, 40); P(...slice(backZone, k), 380, H, B, 50); }
      legs4(P, all, 60, 'steelBlack', 30, 40);
      break;
    }
    case 'daybed': {
      P(...all, 0, H, A, 10);
      P(...inset(all, 20), H, H + 150, B, 40);
      P(...inset(strip(all, OPP[face], 200), 30), H + 150, H + 500, B, 50);
      break;
    }
    case 'chair': {
      const back = OPP[face];
      const seat = inset(all, 30);
      P(...seat, 430, 460, A, 6);
      P(...strip(seat, back, 25), 520, H, A, 6);
      legs4(P, seat, 430, B, 20, 10);
      break;
    }
    case 'stool': {
      P(...all, H - 30, H, A, 6);
      legs4(P, all, H - 30, A, 28, 20);
      break;
    }
    case 'zaisu': {
      const back = OPP[face];
      P(...inset(all, 10), 0, 30, A, 12);
      P(...strip(inset(all, 10), back, 25), 0, H, B, 8);
      P(...strip(strip(inset(all, 10), back, 55), OPP[back], 30), 30, H - 30, A, 10);
      break;
    }
    case 'table': {
      P(...all, H - 30, H, A, 4);
      legs4(P, all, H - 30, B, 40, 30);
      break;
    }
    case 'slab': P(...all, 0, H, A, 3); break;
    case 'ottoman': P(...all, 0, H - 40, A, 3); P(...inset(all, 10), H - 40, H, B, 15); break;
    case 'cushion': P(...all, 0, H, A, Math.min(25, H / 2)); break;
    case 'rug': P(...all, 0, H, A, 4); break;
    case 'led': case 'screen': P(...all, 0, H, it.shape === 'screen' ? 'projection' : A, 0); break;
    case 'socket': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 20), mat('steelBlack'));
      m.position.y = 0.0015; g.add(m); break;
    }
    case 'casters': {
      for (const [cx, cy] of [[80, 80], [W - 80, 80], [80, D - 80], [W - 80, D - 80]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.022, 20), mat('steelBlack'));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set((cx - W / 2) * M, 0.028, (cy - D / 2) * M);
        wheel.castShadow = true;
        g.add(wheel);
        P(cx - 35, cx + 35, cy - 35, cy + 35, 48, H, 'steelBlack', 2);
      }
      break;
    }
    case 'chairstack': {
      const alongX = W < D; // 折叠椅厚度沿较短边排列，每把占 45
      for (let k = 0; k < Math.round(it.count || 0); k++) {
        if (alongX) P(2 + k * 45, 2 + k * 45 + 40, D / 2 - 225, D / 2 + 225, 0, 780, A, 4);
        else P(W / 2 - 225, W / 2 + 225, 2 + k * 45, 2 + k * 45 + 40, 0, 780, A, 4);
      }
      break;
    }
    case 'lamp': {
      const rad = (W / 2) * M * 0.9;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.8, rad * 0.9, 0.04, 32), mat(A));
      base.position.y = 0.02; base.castShadow = base.receiveShadow = true;
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, (H - 100) * M, 40), mat(B));
      shade.position.y = (60 + (H - 100) / 2) * M;
      g.add(base, shade);
      break;
    }
    case 'curtain': {
      const geo = new THREE.PlaneGeometry(W * M, H * M, Math.max(8, Math.round(W / 25)), 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / 0.06) * Math.PI) * 0.018);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat(A));
      m.material.side = THREE.DoubleSide;
      m.position.set(0, (H / 2) * M, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      break;
    }
    case 'shelf': {
      const long = W >= D ? ['w', 'e'] : ['n', 's'];
      for (const s of long) P(...strip(all, s, 20), 0, H, A, 2);
      const n = Math.max(2, Math.round(H / 330));
      for (let k = 0; k <= n; k++) P(...all, Math.min((k * H) / n, H - 20), Math.min((k * H) / n, H - 20) + 20, A, 2);
      break;
    }
    default: P(...all, 0, H, A, 3);
  }
  return g;
}

// 柜体：面板 + 凹槽。局部深度 q 从正面量起；凹槽内衬用 mat2（深色内里），门板用 mat
function buildCabinet(g, P, it) {
  const f = it.facade || { face: 'w', doors: [], recesses: [] };
  const W = it.w, D = it.d, H = it.h;
  const primary = f.face;
  const depthLen = primary === 'w' || primary === 'e' ? W : D;
  const aOrigin = primary === 'w' || primary === 'e' ? it.y : it.x;
  const aLen = primary === 'w' || primary === 'e' ? D : W;
  const DT = f.doors && f.doors.length ? 18 : 0;
  const toe = f.toe || 0;
  const outer = f.doors && f.doors.length ? it.mat2 : it.mat;
  const lining = it.mat2 || it.mat;
  // (a, z, q) → 局部 mm 矩形
  const toLocal = (a0, a1, z0, z1, q0, q1, face) => {
    const fc = face || primary;
    const qq = fc === primary ? [q0, q1] : [depthLen - q1, depthLen - q0];
    if (primary === 'w') return [qq[0], qq[1], a0, a1, z0, z1];
    if (primary === 'e') return [W - qq[1], W - qq[0], a0, a1, z0, z1];
    if (primary === 'n') return [a0, a1, qq[0], qq[1], z0, z1];
    return [a0, a1, D - qq[1], D - qq[0], z0, z1];
  };
  const box = (a0, a1, z0, z1, q0, q1, key, face, r = 2) => {
    if (a1 - a0 < 1 || z1 - z0 < 1 || q1 - q0 < 1) return;
    const [x0, x1, y0, y1, zz0, zz1] = toLocal(a0, a1, z0, z1, q0, q1, face);
    P(x0, x1, y0, y1, zz0, zz1, key, r);
  };
  const zBase = it.z || 0; // 凹槽、门板的 z 按世界高度填写
  const rec = (f.recesses || []).map((r) => ({ ...r, face: r.face || primary, a0: r.a[0] - aOrigin, a1: r.a[1] - aOrigin, z0: r.z[0] - zBase, z1: r.z[1] - zBase }));
  // 按凹槽边界切分正面网格，每格求实体深度范围
  const as = [...new Set([0, aLen, ...rec.flatMap((r) => [r.a0, r.a1])])].sort((p, q) => p - q);
  const zs = [...new Set([toe, H, ...rec.flatMap((r) => [r.z0, r.z1])])].filter((z) => z >= toe).sort((p, q) => p - q);
  for (let i = 0; i < as.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const a0 = as[i], a1 = as[i + 1], z0 = zs[j], z1 = zs[j + 1];
    const am = (a0 + a1) / 2, zm = (z0 + z1) / 2;
    let front = DT, back = depthLen;
    let lined = false;
    for (const r of rec) if (am > r.a0 && am < r.a1 && zm > r.z0 && zm < r.z1) {
      lined = true;
      if (r.face === primary) front = Math.max(front, r.depth); else back = Math.min(back, depthLen - r.depth);
    }
    box(a0, a1, z0, z1, front, back, lined ? lining : outer);
  }
  if (toe) box(0, aLen, 0, toe, 60, depthLen, 'walnutIn');
  // 凹槽内的搁板
  for (const r of rec.filter((x) => x.shelves)) {
    for (let k = 1; k < r.shelves; k++) {
      const z = r.z0 + ((r.z1 - r.z0) * k) / r.shelves;
      box(r.a0, r.a1, z - 10, z + 10, 0, r.depth, lining, r.face);
    }
  }
  // 门板：3 mm 板缝
  for (const [d0, d1, z0, z1] of f.doors || []) box(d0 - aOrigin + 1.5, d1 - aOrigin - 1.5, z0 - zBase + 1.5, z1 - zBase - 1.5, 0, DT, it.mat, primary, 1.5);
  // 有门板的柜体两端补外饰端板
  if (DT) { box(0, 18, toe, H, 0, depthLen, it.mat); box(aLen - 18, aLen, toe, H, 0, depthLen, it.mat); box(0, aLen, H - 18, H + 1, 0, depthLen, it.mat); }
}

// ───────── 房屋外壳 ─────────
const walls = []; // { mesh, nx, nz, cx, cz, slot }
function outward(x1, y1, x2, y2) {
  let nx = y2 - y1, ny = -(x2 - x1);
  const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  if (inPoly((x1 + x2) / 2 + nx * 50, (y1 + y2) / 2 + ny * 50)) { nx = -nx; ny = -ny; }
  return [nx, ny];
}
let floorMesh;
function buildShell() {
  const shell = new THREE.Group();
  const shape = new THREE.Shape(ROOM.map(([x, y]) => new THREE.Vector2(x * M, -y * M)));
  const floorGeo = new THREE.ShapeGeometry(shape);
  floorGeo.rotateX(-Math.PI / 2);
  floorMesh = new THREE.Mesh(floorGeo, mat('tile'));
  floorMesh.receiveShadow = true;
  shell.add(floorMesh);
  // 天花板：只参与投影不被相机看到，保证天光只经窗洞进入
  const ceilGeo = new THREE.ShapeGeometry(shape);
  ceilGeo.rotateX(-Math.PI / 2);
  ceilGeo.translate(0, CEILING * M, 0);
  const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  ceiling.castShadow = true;
  shell.add(ceiling);

  const T = WALL_T, H = CEILING;
  const add = (x0, x1, z0, z1, y0, y1, key, n, slot) => {
    const m = block(x0 * M, x1 * M, y0 * M, y1 * M, z0 * M, z1 * M, key, 0);
    if (MATERIALS[key].opacity !== undefined) m.castShadow = false;
    shell.add(m);
    walls.push({ mesh: m, nx: n[0], nz: n[1], cx: ((x0 + x1) / 2) * M, cz: ((z0 + z1) / 2) * M, slot });
  };
  ROOM.forEach(([x1, y1], i) => {
    const [x2, y2] = ROOM[(i + 1) % ROOM.length];
    const horiz = y1 === y2;
    const [nx, ny] = outward(x1, y1, x2, y2);
    const a = Math.min(horiz ? x1 : y1, horiz ? x2 : y2), b = Math.max(horiz ? x1 : y1, horiz ? x2 : y2);
    const ops = OPENINGS.filter((o) => o.edge === i);
    const cuts = new Set([a, b, ...ops.flatMap((o) => [o.from, o.to])]);
    if (MEDIA_WALL.edge === i) { cuts.add(MEDIA_WALL.from); cuts.add(MEDIA_WALL.to); }
    const pts = [...cuts].filter((v) => v >= a && v <= b).sort((p, q) => p - q);
    const rect = (s, e, o0, o1) => horiz
      ? [s, e, y1 + Math.min(ny * o0, ny * o1), y1 + Math.max(ny * o0, ny * o1)]
      : [x1 + Math.min(nx * o0, nx * o1), x1 + Math.max(nx * o0, nx * o1), s, e];
    for (let k = 0; k < pts.length - 1; k++) {
      const s = pts[k], e = pts[k + 1], mid = (s + e) / 2;
      const op = ops.find((o) => mid > o.from && mid < o.to);
      const media = MEDIA_WALL.edge === i && mid > MEDIA_WALL.from && mid < MEDIA_WALL.to;
      const r = rect(s, e, 0, T);
      if (!op) { add(...r, 0, H, 'limeWhite', [nx, ny], media ? 'media' : 'base'); walls[walls.length - 1].edge = i; continue; }
      if (op.bottom > 0) add(...r, 0, op.bottom, 'limeWhite', [nx, ny], 'base');
      add(...r, op.top, H, 'limeWhite', [nx, ny], 'base');
      if (op.fill) {
        add(...rect(s, e, T / 2 - 20, T / 2 + 20), op.bottom, op.top, op.fill, [nx, ny]);
        if (op.kind === 'window') { // 窗框与中梃
          const fr = (s0, e0, b0, t0) => add(...rect(s0, e0, T / 2 - 30, T / 2 + 30), b0, t0, 'charcoal', [nx, ny]);
          fr(s, e, op.bottom, op.bottom + 50); fr(s, e, op.top - 50, op.top); fr(s, s + 50, op.bottom, op.top); fr(e - 50, e, op.bottom, op.top);
          const m1 = s + (e - s) / 3, m2 = s + (2 * (e - s)) / 3;
          fr(m1 - 25, m1 + 25, op.bottom, op.top); fr(m2 - 25, m2 + 25, op.bottom, op.top);
        }
      }
    }
  });
  ROOM.forEach(([x, y], i) => {
    const [px, py] = ROOM[(i - 1 + ROOM.length) % ROOM.length], [qx, qy] = ROOM[(i + 1) % ROOM.length];
    const n1 = outward(px, py, x, y), n2 = outward(x, y, qx, qy);
    const cx = x + ((n1[0] + n2[0]) * T) / 2, cy = y + ((n1[1] + n2[1]) * T) / 2;
    if (inPoly(cx, cy)) return;
    add(cx - T / 2, cx + T / 2, cy - T / 2, cy + T / 2, 0, H, 'limeWhite', [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2], 'base');
  });
  for (const f of FIXED) {
    const m = block(f.x * M, (f.x + f.w) * M, 0, f.h * M, f.y * M, (f.y + f.d) * M, f.mat, 0.004);
    shell.add(m);
  }
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
  const m = block(b.x0 * M, b.x1 * M, b.z0 * M, b.z1 * M, b.y0 * M, b.y1 * M, b.key, 0.002);
  m.material = houseMat(b.key);
  m.castShadow = m.receiveShadow = false;
  return m;
}
function buildHouse() {
  const g = new THREE.Group();
  for (const r of HOUSE_ROOMS) {
    const key = r.wet ? 'wetTile' : 'tileGloss';
    const geo = new THREE.ShapeGeometry(new THREE.Shape(r.poly.map(([x, y]) => new THREE.Vector2(x * M, -y * M))));
    geo.rotateX(-Math.PI / 2);
    const t = tileOf(key);
    if (t) { // 地面纹理按世界尺度，与客厅地面同一周期
      const uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / t, pos.getZ(i) / t);
    }
    g.add(new THREE.Mesh(geo, houseMat(key)));
  }
  for (const b of wallBoxes()) g.add(houseMesh(b));
  return g;
}
// 固定件与上一任住户家具随模型重建：现状带旧家具，方案去掉被替换的固定件
let houseItemsGroup = new THREE.Group();
function buildHouseItems(model) {
  disposeGroup(houseItemsGroup);
  houseItemsGroup = new THREE.Group();
  for (const it of houseItems(model.key, model.replaces || [])) for (const b of itemBoxes(it)) houseItemsGroup.add(houseMesh(b));
  scene.add(houseItemsGroup);
}

// 方案在其他房间的构件：材质换成按房间区分的副本，挂上剖切面；相机对准某个房间时，只有该房间显示全高
const CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_H * M);
const roomClip = new Map(HOUSE_ROOMS.map((r) => [r.id, [CUT_PLANE]]));
const roomMats = new Map();
function clipToRoom(m, room) {
  return Object.assign(m, { clippingPlanes: roomClip.get(room), clipShadows: true, side: THREE.DoubleSide });
}
function roomMaterial(m, room) {
  const k = `${room}|${m.uuid}`;
  if (!roomMats.has(k)) roomMats.set(k, clipToRoom(m.clone(), room));
  return roomMats.get(k);
}
function applyRoomClip() {
  for (const [room, planes] of roomClip) {
    planes.length = 0;
    if (ui.view !== 'persp' || ui.room !== room) planes.push(CUT_PLANE);
  }
}
function applyShell(model) {
  for (const w of walls) if (w.slot) w.mesh.material = mat(w.slot === 'media' ? model.walls.media : model.walls.base);
  floorMesh.material = mat(model.floor || 'tile');
  const t = tileOf(model.floor || 'tile');
  if (t) { // 地面纹理按世界尺度
    const uv = floorMesh.geometry.attributes.uv, pos = floorMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / t, pos.getZ(i) / t);
    uv.needsUpdate = true;
  }
}
function updateCutaway() {
  const hidden = new Set();
  for (const w of walls) {
    w.mesh.visible = ui.view !== 'persp' || (persp.position.x - w.cx) * w.nx + (persp.position.z - w.cz) * w.nz < 0;
    if (!w.mesh.visible && w.edge !== undefined) hidden.add(w.edge);
  }
  // 贴在墙上的投影画面：所在墙被剖切隐藏时一并隐藏，避免浮在空中
  for (const e of parts.values()) if (e.wallEdge !== undefined) e.group.visible = !hidden.has(e.wallEdge);
}

// ───────── 构件登记与动画 ─────────
scene.add(buildShell());
const parts = new Map(); // id → { group, dims, carried, mats }
let partRoot = new THREE.Group();
let lights = new THREE.Group();
let labels = new THREE.Group();
scene.add(partRoot, lights, labels);

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isLight && o.dispose) o.dispose();
    if (o.isCSS2DObject) o.element.remove();
    if (o.material && o.userData.ownMat) [].concat(o.material).forEach((m) => m.dispose());
  });
  if (g.parent) g.parent.remove(g);
}

function createEntry(pose) {
  const group = buildPart(pose);
  const entry = { group, dims: { w: pose.w, d: pose.d, h: pose.h, count: pose.count }, carried: !!pose.part.carried || !!pose.part.only };
  if (entry.carried) { // 搬动物品需要独立材质以便淡入淡出
    group.traverse((o) => {
      if (o.isMesh) { o.material = [].concat(o.material).map((m) => Object.assign(m.clone(), { transparent: true })); if (o.material.length === 1) o.material = o.material[0]; o.userData.ownMat = true; }
    });
  }
  const room = pose.part.room;
  if (room) group.traverse((o) => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map((m) => (o.userData.ownMat ? clipToRoom(m, room) : roomMaterial(m, room)));
    if (o.material.length === 1) o.material = o.material[0];
  });
  entry.wallEdge = pose.part.wallEdge;
  partRoot.add(group);
  parts.set(pose.id, entry);
  return entry;
}

const V = (a, b, c) => new THREE.Vector3(a, b, c);
function place(entry, pose) {
  const g = entry.group;
  if (pose.kind === 'hinge') {
    const alongY = pose.axis === 'y';
    const u = alongY ? V(pose.u[0], pose.u[1], 0) : V(0, pose.u[1], pose.u[0]);
    const n = (alongY ? V(pose.n[0], pose.n[1], 0) : V(0, pose.n[1], pose.n[0])).multiplyScalar(pose.side);
    const s = new THREE.Vector3().crossVectors(u, n);
    const mid = ((pose.s0 + pose.s1) / 2) * M;
    const o = alongY ? V(pose.p0 * M, pose.z0 * M, mid) : V(mid, pose.z0 * M, pose.p0 * M);
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(u, n, s).setPosition(o);
    g.matrixWorldNeedsUpdate = true;
  } else {
    g.position.set((pose.x + pose.w / 2) * M, (pose.z || 0) * M, (pose.y + pose.d / 2) * M);
    g.scale.set(pose.w / entry.dims.w || 1, pose.h / entry.dims.h || 1, pose.d / entry.dims.d || 1);
  }
  if (entry.carried) {
    g.visible = pose.opacity > 0.01;
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = pose.opacity > 0.99;
      [].concat(o.material).forEach((m) => { m.opacity = pose.opacity; m.depthWrite = pose.opacity > 0.99; });
    });
  }
}

function applyPoses(A, B, t) {
  const model = modelOf(ui.model);
  const poses = poseAll(model, A, B, t);
  for (const pose of poses) {
    let e = parts.get(pose.id);
    if (e && pose.shape === 'chairstack' && Math.round(pose.count) !== Math.round(e.dims.count)) { disposeGroup(e.group); parts.delete(pose.id); e = null; }
    if (!e) e = createEntry(pose);
    place(e, pose);
  }
}

function finalize(st) {
  const model = modelOf(ui.model);
  for (const [id, e] of parts) {
    const part = model.parts.find((p) => p.id === id);
    if (!part || !present(part, st)) { disposeGroup(e.group); parts.delete(id); }
  }
  applyPoses(st, st, 1);
  buildLights();
}

let anim = null;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function durMs() { const v = cssVar('--dur-transform'); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; }
function easeFn() { return cssVar('--ease-transform') === 'ease-in-out' ? easeInOut : (t) => t; }
// 按 legsOf 的路径逐段播放，每段一个 --dur-transform
function transition(from, to) {
  const dur = durMs();
  if (!dur || from === to) { finalize(to); buildLabels(modelOf(ui.model)); render(); return; }
  anim = { legs: legsOf(modelOf(ui.model), from, to), i: 0, start: performance.now(), dur, ease: easeFn() };
  requestAnimationFrame(tick);
}
function tick(now) {
  if (!anim) return;
  const [A, B] = anim.legs[anim.i];
  const t = Math.min(1, (now - anim.start) / anim.dur);
  applyPoses(A, B, anim.ease(t));
  render();
  if (t < 1) { requestAnimationFrame(tick); return; }
  finalize(B);
  if (++anim.i < anim.legs.length) { anim.start = now; requestAnimationFrame(tick); return; }
  anim = null;
  buildLabels(modelOf(ui.model));
  render();
}

// ───────── 光照 ─────────
function buildLights() {
  disposeGroup(lights);
  lights = new THREE.Group();
  const model = modelOf(ui.model);
  const items = resolveState(model, model.key === 'current' ? 'daily' : ui.state);
  const night = ui.light === 'night';
  lights.add(new THREE.HemisphereLight('#e8eef3', '#bfb8ad', night ? LIGHT.night.hemi : LIGHT.day.hemi));
  scene.environmentIntensity = night ? LIGHT.night.env : LIGHT.day.env;
  if (!night) {
    const sun = new THREE.DirectionalLight('#f2f6fb', LIGHT.day.sun);
    sun.position.set(1.8, 5, -5);
    sun.target.position.set(1.8, 0, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 6; // 北窗无直射光，阴影做柔
    lights.add(sun, sun.target);
  } else {
    for (const c of model.ceil) {
      const cool = c.kind === 'cool';
      const p = new THREE.PointLight(MATERIALS[cool ? 'ledCool' : 'lampWarm'].emissive, cool ? LIGHT.night.ceil * 5 : LIGHT.night.ceil);
      p.position.set(c.x * M, CEILING * M - 0.15, c.y * M);
      lights.add(p);
    }
    for (const it of items.filter((i) => i.light)) {
      const color = MATERIALS[it.mat2 || it.mat].emissive || MATERIALS.ledStrip.emissive;
      if (it.light === 'area') {
        const longX = it.w > it.d;
        const L = new THREE.RectAreaLight(color, LIGHT.night.area, Math.max(40, Math.min(it.w, it.d)) * M, Math.max(it.w, it.d) * M);
        const c = V((it.x + it.w / 2) * M, (it.z || 0) * M, (it.y + it.d / 2) * M);
        L.position.copy(c);
        L.up.set(longX ? 1 : 0, 0, longX ? 0 : 1);
        if (it.lightDir === 'wash') L.lookAt(c.x + 0.35, c.y - 1, c.z); else L.lookAt(c.x, c.y - 1, c.z);
        lights.add(L);
      } else {
        const p = new THREE.PointLight(color, LIGHT.night.lamp);
        p.position.set((it.x + it.w / 2) * M, ((it.z || 0) + it.h * 0.6) * M, (it.y + it.d / 2) * M);
        p.castShadow = true;
        p.shadow.mapSize.set(512, 512);
        p.shadow.bias = -0.002;
        lights.add(p);
      }
    }
    const screen = items.find((i) => i.shape === 'screen');
    if (screen) {
      const p = new THREE.PointLight(MATERIALS.projection.emissive, LIGHT.night.screen);
      const toEast = screen.w < 100;
      p.position.set((screen.x + screen.w / 2) * M + (toEast ? 0.6 : 0), (screen.z + screen.h / 2) * M, (screen.y + screen.d / 2) * M + (toEast ? 0 : -0.6));
      lights.add(p);
    }
  }
  for (const m of matCache.values()) if (m.userData.glow) m.emissiveIntensity = night ? LIGHT.night.glow : LIGHT.day.glow;
  for (const e of parts.values()) e.group.traverse((o) => { if (o.userData.ownMat) [].concat(o.material).forEach((m) => { if (m.emissive) m.emissiveIntensity = night ? LIGHT.night.glow : LIGHT.day.glow; }); });
  dimHouse(night && model.key === 'current');
  mat('projection').emissiveIntensity = LIGHT.projection;
  scene.background = new THREE.Color(cssVar(night ? '--c-canvas-night' : '--c-canvas-day'));
  scene.add(lights);
}

function label(text, x, z, cls) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.set(x * M, 0.05, z * M);
  return o;
}
function buildLabels(model) {
  disposeGroup(labels);
  labels = new THREE.Group();
  const st = model.key === 'current' ? 'daily' : ui.state;
  for (const z of model.zones.filter((q) => !q.only || q.only.includes(st))) labels.add(label(z.name, z.x, z.y, 'zone-label'));
  // 房间名只在全屋俯视里出现：CSS2D 标签没有遮挡判断，透视里会压在客厅墙上
  if (ui.view === 'house') {
    for (const r of HOUSE_ROOMS) labels.add(label(model.rooms ? `${r.name} · ${ROLES[r.id]}` : r.name, r.label[0], r.label[1], 'room-label'));
    labels.add(label(HOUSE_NOTE, 3300, -3000, 'dim-label')); // 客厅北侧的空白处
  }
  if (ui.view === 'plan') {
    labels.add(label('东西净宽约 3.6 m（待复核）', 1800, -1050, 'dim-label'));
    labels.add(label('南北进深约 8.9 m（待复核）', 4350, 3800, 'dim-label'));
  }
  scene.add(labels);
}

// 房间视角：相机高位、约 65°–70° 俯角看房间中心，越过南侧的到顶柜体；偏移量（米）按各房间高柜的位置逐个选定
const ROOM_AIM = {
  bedA: { at: [-1800, -3600], off: [-1.2, 7.4, 3.2] },
  bedB: { at: [-3200, -300], off: [0.6, 7.6, 2.8] },
  bedC: { at: [-1600, 3000], off: [1.4, 6.6, 3.0] },
  bath: { at: [-1500, 5400], off: [1.0, 5.6, 2.6] },
  kitchen: { at: [4300, 6500], off: [0.8, 7.8, 2.2] },
};
const ROOM_VIEWS = Object.fromEntries(Object.entries(ROOM_AIM).map(([id, { at, off }]) => {
  const t = [at[0] * M, 0.5, at[1] * M];
  return [id, { pos: [t[0] + off[0], t[1] + off[1], t[2] + off[2]], target: t }];
}));
function aimCamera(model) {
  const v = ui.room === 'living' ? VIEWS[VIEW_OF[model.key]] : ROOM_VIEWS[ui.room];
  persp.position.set(...v.pos);
  orbit.target.set(...v.target);
  orbit.update();
  applyRoomClip();
}

// 切换模型：重建全部构件
function rebuildModel() {
  const model = modelOf(ui.model);
  anim = null;
  for (const e of parts.values()) disposeGroup(e.group);
  parts.clear();
  applyShell(model);
  buildHouseItems(model);
  aimCamera(model);
  const st = model.key === 'current' ? 'daily' : ui.state;
  applyPoses(st, st, 1);
  buildLights();
  buildLabels(model);
  render();
}

// ───────── 渲染 ─────────
function render() {
  updateCutaway();
  const cam = ui.view === 'persp' ? persp : ortho;
  renderPass.camera = cam;
  gtao.enabled = aoAllowed && ui.view === 'persp';
  composer.render();
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
  composer.setSize(w, h);
  labelRenderer.setSize(w, h);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
  const { bw, bh } = FRAMES[ui.view === 'house' ? 'house' : 'plan'], aspect = w / h; // 俯视按当前取景框适配
  const halfH = Math.max(bh / 2, bw / 2 / aspect) * 1.08;
  Object.assign(ortho, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
  ortho.updateProjectionMatrix();
  render();
}
// 单帧耗时超过预算则关闭环境光遮蔽（计划第七节），结果写在 body 的 data 属性上供测试读取
function measureFrame() {
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  composer.render(); composer.render(); sync(); // 预热两帧：着色器编译不计入
  const t0 = performance.now();
  for (let i = 0; i < 3; i++) { composer.render(); sync(); }
  const ms = (performance.now() - t0) / 3;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  document.body.dataset.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '未知';
  if (ms > LIGHT.aoBudgetMs) aoAllowed = false;
  document.body.dataset.frameMs = String(Math.round(ms));
  document.body.dataset.ao = aoAllowed ? 'on' : 'off';
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
  model: segButtons($('modelBar'), MODELS.map((m) => ({ key: m.key, label: m.label })), (k) => { if (k === ui.model) return; ui.model = k; renderUI(); rebuildModel(); }),
  view: segButtons($('viewBar'), [{ key: 'persp', label: '透视' }, { key: 'plan', label: '俯视' }, { key: 'house', label: '全屋' }], (k) => { ui.view = k; orbit.enabled = k === 'persp'; plan.enabled = k !== 'persp'; applyRoomClip(); renderUI(); buildLabels(modelOf(ui.model)); if (k !== 'persp') frameOrtho(); render(); }),
  room: segButtons($('roomBar'), [{ key: 'living', label: '客厅' }, ...HOUSE_ROOMS.map((r) => ({ key: r.id, label: r.name }))], (k) => {
    ui.room = k; ui.view = 'persp'; orbit.enabled = true; plan.enabled = false; aimCamera(modelOf(ui.model)); renderUI(); buildLabels(modelOf(ui.model)); render();
  }),
  light: segButtons($('lightBar'), [{ key: 'day', label: '昼' }, { key: 'night', label: '夜' }], (k) => { ui.light = k; renderUI(); buildLights(); render(); }),
  state: segButtons($('stateBar'), STATES, (k) => { if (k === ui.state) return; const from = ui.state; ui.state = k; renderUI(); transition(from, k); }),
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
  syncButtons(bars.room, ui.view === 'persp' ? ui.room : null);
  syncButtons(bars.light, ui.light);
  syncButtons(bars.state, ui.state, isCurrent);
  stateNote.hidden = !isCurrent;
  renderPanel(model);
}

const pct = (v) => `${Math.round(v * 100)}%`;
function renderPanel(m) {
  let h = `<h1>${esc(m.title)}</h1>`;
  h += `<div class="caption">${esc(m.stamp || '模型示意，非效果图；颜色与纹理代表材料')}</div>`;
  h += `<div class="notice caption"><strong>尺寸待现场复核</strong>　户型图的尺寸标注与面积比例冲突，现按面积与门宽推算。最需要实测的一个数：${esc(SURVEY.keyCheck)}。</div>`;
  if (m.signature) h += `<p>${esc(m.signature)}</p>`;
  h += `<p>${esc(m.summary)}</p>`;
  if (m.diagnosis) {
    h += '<h2>主要错配</h2><ul class="list">' + m.diagnosis.map((d) =>
      `<li><span class="dim">${esc(d.dim)}</span><span>${esc(d.text)}</span><span class="caption">诊断清单 ${esc(d.basis)}</span></li>`).join('') + '</ul>';
  }
  if (m.facts) {
    const fr = freeRatio(resolveState(m, 'daily'));
    const rows = [...m.facts, ['收起态地面空置率', fr.usable - fr.floor > 0.01 ? `落地 ${pct(fr.floor)}，含地台面 ${pct(fr.usable)}` : pct(fr.floor)]];
    h += '<dl class="facts">' + rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  }
  if (m.steps) {
    const st = STATES.find((s) => s.key === ui.state);
    const s = m.steps[ui.state];
    h += `<h2>「${esc(st.label)}」的展开成本</h2>`;
    h += s.list.length
      ? `<ol class="steps">${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p class="caption">估时约 ${s.sec} 秒（推测，按一人操作）</p>`
      : '<p class="caption">收起态，无需操作。</p>';
  }
  if (m.mechanisms) {
    h += '<h2>机构清单</h2><ul class="list">' + m.mechanisms.map((c) =>
      `<li><span class="lv lv-${esc(c.level)}">${esc(c.level)}</span><span>${esc(c.name)}</span><span class="caption">${esc(c.hw)}</span></li>`).join('') + '</ul>';
  }
  if (m.changes && m.mechanisms) {
    h += '<h2>改动清单</h2><ul class="list">' + m.changes.map((c) =>
      `<li><span class="lv lv-${esc(c.level)}">${esc(c.level)}</span><span>${esc(c.text)}</span><span class="caption">${esc(c.rev)} · 依据：${esc(c.basis)}</span></li>`).join('') + '</ul>';
  }
  if (m.palette && m.mechanisms) {
    h += '<h2>材料样板</h2><div class="swatches">' + m.palette.map((k) =>
      `<div class="swatch"><span class="chip" style="background:${esc(MATERIALS[k].color)}"></span><span class="caption">${esc(MATERIALS[k].name)}</span></div>`).join('') + '</div>';
  }
  if (m.rooms) {
    h += '<h2>全屋</h2><p class="caption">卧室 A 主卧，卧室 B 平时书房、父母来住时变客房，卧室 C 衣帽间；厨卫保持原水电点位。尺寸为图面读数，待现场复核。</p>';
    for (const r of m.rooms) {
      const name = HOUSE_ROOMS.find((x) => x.id === r.room).name;
      h += `<h3>${esc(name)} · ${esc(ROLES[r.room])}</h3><ul class="list">` + r.changes.map((c) =>
        `<li><span class="lv lv-${esc(c.level)}">${esc(c.level)}</span><span>${esc(c.text)}</span><span class="caption">${esc(c.rev)} · 依据：${esc(c.basis)}</span></li>`).join('') + '</ul>';
    }
  }
  h += '<p class="caption">「#」编号对应 promept.md 第八节诊断清单；L0–L4 为第七节改动层级（L4 只作需专业人员评估的选项）。</p>';
  $('panel').innerHTML = h;
}

// ───────── 出错兜底：SVG 俯视平面 ─────────
function showError(e) {
  $('loading').hidden = true;
  const box = $('error');
  box.hidden = false;
  $('gl').hidden = true;
  const items = resolveState(modelOf(ui.model), 'daily').filter((i) => i.mount === 'floor' || i.deck);
  const pts = ROOM.map(([x, y]) => `${x},${y}`).join(' ');
  const rooms = HOUSE_ROOMS.map((r) => `<polygon points="${r.poly.map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" style="stroke:var(--c-text-2)" stroke-width="30"/>`).join('');
  const rects = [...items, ...houseItems(ui.model).filter((i) => !i.z)].map((i) => `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.d}" fill="${MATERIALS[i.mat].color}" style="stroke:var(--c-text-2)" stroke-width="15"/>`).join('');
  box.innerHTML = `<div>无法创建 WebGL 上下文，3D 模型不可用（${esc(e.message)}）。请换用支持 WebGL 的浏览器。下面是同一数据绘制的收起态俯视平面。</div>`
    + `<svg viewBox="-6100 -6600 11700 15900" role="img" aria-label="收起态全屋俯视平面">${rooms}<polygon points="${pts}" fill="none" style="stroke:var(--c-text)" stroke-width="30"/>${rects}</svg>`;
}

// 测试钩子：截图脚本用它定格变形过程中的某一帧（不影响正常交互）
window.__viz = {
  seek(A, B, t) {
    anim = null;
    const model = modelOf(ui.model);
    for (const [id, e] of parts) {
      const part = model.parts.find((p) => p.id === id);
      if (!part || (!present(part, A) && !present(part, B))) { disposeGroup(e.group); parts.delete(id); }
    }
    ui.state = t < 1 ? A : B;
    renderUI();
    applyPoses(A, B, t);
    render();
  },
  settle(st) { ui.state = st; renderUI(); finalize(st); render(); },
};

// ───────── 启动 ─────────
new ResizeObserver(resize).observe(stage);
renderUI();
rebuildModel();
resize();
measureFrame();
render();
$('loading').hidden = true;
