// 程序纹理：运行时用 Canvas 生成，不内嵌图片；固定随机种子，保证每次打开一致
// 纹理只做低对比的材料细节（DESIGN.md 第 7 节），颜色以 materials.js 的 color / accent 为准
import * as THREE from 'three';

const SIZE = 512;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckle(g, r, color, n, alpha, size = 1.5) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * r();
    g.fillRect(r() * SIZE, r() * SIZE, size, size);
  }
  g.globalAlpha = 1;
}

const PAINT = {
  // 木纹：沿画布竖向的年轮线，带轻微摆动与节疤感的明暗
  wood(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 90; i++) {
      const x0 = r() * SIZE, amp = 2 + r() * 6, freq = 0.004 + r() * 0.01, ph = r() * 6.28;
      g.strokeStyle = accent; g.globalAlpha = 0.08 + r() * 0.18; g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      for (let y = 0; y <= SIZE; y += 8) g.lineTo(x0 + Math.sin(y * freq + ph) * amp, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    speckle(g, r, accent, 1400, 0.12);
  },
  // 烧杉：碳化后的龟裂鳞片，深色底上有不规则的块与更深的裂纹
  yakisugi(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    let y = 0;
    while (y < SIZE) {
      const h = 10 + r() * 22;
      let x = 0;
      while (x < SIZE) {
        const w = 18 + r() * 46;
        g.fillStyle = accent; g.globalAlpha = 0.25 + r() * 0.45;
        g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
        x += w;
      }
      y += h;
    }
    g.globalAlpha = 0.9; g.strokeStyle = '#141210'; g.lineWidth = 1.2;
    for (let i = 0; i < 160; i++) {
      const x = r() * SIZE, yy = r() * SIZE;
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (r() - 0.5) * 20, yy + 6 + r() * 26); g.stroke();
    }
    g.globalAlpha = 1;
  },
  // 灰泥：大尺度的云状明暗与细颗粒
  plaster(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      const x = r() * SIZE, y = r() * SIZE, rad = 40 + r() * 140;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, accent); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.03 + r() * 0.04; g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalAlpha = 1;
    speckle(g, r, accent, 4000, 0.1, 1);
  },
  // 蔺草：横向细密的编织行，每隔一段有经线
  tatami(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 4) {
      g.fillStyle = accent; g.globalAlpha = 0.12 + r() * 0.2;
      g.fillRect(0, y, SIZE, 1.6);
    }
    g.globalAlpha = 0.22; g.fillStyle = accent;
    for (let x = 0; x < SIZE; x += 32) g.fillRect(x, 0, 1.2, SIZE);
    g.globalAlpha = 1;
    speckle(g, r, accent, 900, 0.15);
  },
  // 亚麻：经纬交错的细格与不均匀的纱线
  linen(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = accent;
    for (let i = 0; i < SIZE; i += 3) {
      g.globalAlpha = 0.06 + r() * 0.12; g.fillRect(0, i, SIZE, 1);
      g.globalAlpha = 0.06 + r() * 0.12; g.fillRect(i, 0, 1, SIZE);
    }
    g.globalAlpha = 1;
  },
  // 羊毛：柔和的颗粒
  wool(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    speckle(g, r, accent, 16000, 0.3, 2);
  },
  // 抛光砖：极淡的石纹与砖缝（一个周期对应一块 800 砖）
  tile(g, r, base, accent) {
    g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = accent; g.globalAlpha = 0.08 + r() * 0.1; g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath();
      let x = r() * SIZE, y = r() * SIZE;
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - 0.3) * 90; y += (r() - 0.5) * 70; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 0.5; g.fillStyle = accent;
    g.fillRect(0, 0, SIZE, 2); g.fillRect(0, 0, 2, SIZE);
    g.globalAlpha = 1;
  },
};

const cache = new Map();

// 返回可平铺的颜色贴图；tile 为一个周期对应的真实尺寸（mm），供 worldUV 换算
export function textureFor(key, spec, color) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  PAINT[spec.kind](g, rng(seed), color, spec.accent);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

// 按世界尺度重写 UV：同一材料在不同构件上纹理密度一致；tileM 为纹理周期（米）
// 法向朝 x 的面取 (z, y)，朝 y 的面取 (x, z)，朝 z 的面取 (x, y)；offset 为几何在世界中的平移，保证相邻构件纹理连续
export function worldUV(geometry, tileM, offset = [0, 0, 0]) {
  const pos = geometry.attributes.position, nor = geometry.attributes.normal, uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset[0], y = pos.getY(i) + offset[1], z = pos.getZ(i) + offset[2];
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, z / tileM, y / tileM);
    else if (ay >= az) uv.setXY(i, x / tileM, z / tileM);
    else uv.setXY(i, x / tileM, y / tileM);
  }
  uv.needsUpdate = true;
  return geometry;
}
