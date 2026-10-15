import * as THREE from "three";
import type { TexKind } from "./types";

const SIZE = 512;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckle(g: CanvasRenderingContext2D, r: () => number, color: string, n: number, alpha: number, size = 1.5) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * r();
    g.fillRect(r() * SIZE, r() * SIZE, size, size);
  }
  g.globalAlpha = 1;
}

type Paint = (g: CanvasRenderingContext2D, r: () => number, base: string, accent: string) => void;

const PAINT: Record<string, Paint> = {
  wood(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 90; i++) {
      const x0 = r() * SIZE;
      const amp = 2 + r() * 6;
      const freq = 0.004 + r() * 0.01;
      const ph = r() * 6.28;
      g.strokeStyle = accent;
      g.globalAlpha = 0.08 + r() * 0.18;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      for (let y = 0; y <= SIZE; y += 8) g.lineTo(x0 + Math.sin(y * freq + ph) * amp, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    speckle(g, r, accent, 1400, 0.12);
  },
  plaster(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const rad = 40 + r() * 140;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, accent);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.03 + r() * 0.04;
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalAlpha = 1;
    speckle(g, r, accent, 4000, 0.1, 1);
  },
  tatami(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 4) {
      g.fillStyle = accent;
      g.globalAlpha = 0.12 + r() * 0.2;
      g.fillRect(0, y, SIZE, 1.6);
    }
    g.globalAlpha = 0.22;
    g.fillStyle = accent;
    for (let x = 0; x < SIZE; x += 32) g.fillRect(x, 0, 1.2, SIZE);
    g.globalAlpha = 1;
    speckle(g, r, accent, 900, 0.15);
  },
  linen(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = accent;
    for (let i = 0; i < SIZE; i += 3) {
      g.globalAlpha = 0.06 + r() * 0.12;
      g.fillRect(0, i, SIZE, 1);
      g.globalAlpha = 0.06 + r() * 0.12;
      g.fillRect(i, 0, 1, SIZE);
    }
    g.globalAlpha = 1;
  },
  wool(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    speckle(g, r, accent, 16000, 0.3, 2);
  },
  tile(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = accent;
      g.globalAlpha = 0.08 + r() * 0.1;
      g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath();
      let x = r() * SIZE;
      let y = r() * SIZE;
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.3) * 90;
        y += (r() - 0.5) * 70;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 0.5;
    g.fillStyle = accent;
    g.fillRect(0, 0, SIZE, 2);
    g.fillRect(0, 0, 2, SIZE);
    g.globalAlpha = 1;
  },
  planks(g, r, base, accent) {
    PAINT.wood(g, r, base, accent);
    const plank = SIZE / 8;
    g.fillStyle = accent;
    g.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      g.fillRect(i * plank, 0, 2, SIZE);
      const shift = (i % 2) * SIZE * 0.5;
      g.fillRect(i * plank, shift % SIZE, plank, 2);
      if (shift) g.fillRect(i * plank, 0, plank, 2);
    }
    g.globalAlpha = 1;
  },
  ceramic(g, _r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = accent;
    g.fillRect(0, 0, SIZE, 2);
    g.fillRect(0, 0, 2, SIZE);
  },
  cane(g, _r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.strokeStyle = accent;
    g.lineWidth = 2;
    const step = SIZE / 6;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        g.beginPath();
        g.arc((i + 0.5) * step, (j + 0.5) * step, step * 0.18, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.beginPath();
    for (let x = -SIZE; x < SIZE * 2; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x + SIZE, SIZE);
      g.moveTo(x, SIZE);
      g.lineTo(x + SIZE, 0);
    }
    g.stroke();
  },
  persian(g, r, base) {
    const ivory = "#d8cfbf";
    const brass = "#9a7a45";
    const blue = "#7da7c7";
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.strokeStyle = brass;
    g.lineWidth = SIZE * 0.02;
    g.strokeRect(SIZE * 0.03, SIZE * 0.03, SIZE * 0.94, SIZE * 0.94);
    g.strokeStyle = blue;
    g.lineWidth = SIZE * 0.012;
    g.strokeRect(SIZE * 0.07, SIZE * 0.07, SIZE * 0.86, SIZE * 0.86);
    g.fillStyle = ivory;
    const diamond = (x: number, y: number) => {
      g.beginPath();
      g.moveTo(x, y - SIZE * 0.06);
      g.lineTo(x + SIZE * 0.05, y);
      g.lineTo(x, y + SIZE * 0.06);
      g.lineTo(x - SIZE * 0.05, y);
      g.fill();
    };
    diamond(SIZE * 0.16, SIZE * 0.16);
    diamond(SIZE * 0.84, SIZE * 0.16);
    diamond(SIZE * 0.16, SIZE * 0.84);
    diamond(SIZE * 0.84, SIZE * 0.84);
    g.fillStyle = brass;
    g.beginPath();
    g.arc(SIZE / 2, SIZE / 2, SIZE * 0.12, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ivory;
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.ellipse(SIZE / 2 + Math.cos(a) * SIZE * 0.16, SIZE / 2 + Math.sin(a) * SIZE * 0.16, SIZE * 0.035, SIZE * 0.02, a, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = blue;
    for (let i = 0; i < 40; i++) {
      const x = SIZE * 0.2 + r() * SIZE * 0.6;
      const y = SIZE * 0.2 + r() * SIZE * 0.6;
      if (Math.hypot(x - SIZE / 2, y - SIZE / 2) < SIZE * 0.2) continue;
      g.fillRect(x, y, 2, 6);
      g.fillRect(x - 2, y + 2, 6, 2);
    }
  },
  stripe(g, _r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = accent;
    const band = SIZE / 4;
    for (let x = 0; x < SIZE; x += band * 2) g.fillRect(x, 0, band, SIZE);
  },
  floral(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = accent;
    for (let i = 0; i < 14; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const rad = 6 + r() * 8;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * rad, y + Math.sin(a) * rad, rad * 0.55, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
  brushed(g, r, base, accent) {
    g.fillStyle = base;
    g.fillRect(0, 0, SIZE, SIZE);
    g.strokeStyle = accent;
    for (let i = 0; i < 400; i++) {
      const y = r() * SIZE;
      g.globalAlpha = 0.05 + r() * 0.07;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(SIZE, y + (r() - 0.5) * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  },
};

const cache = new Map<string, THREE.CanvasTexture>();

export function textureFor(key: string, spec: { kind: TexKind; tile: number; accent: string }, color: string) {
  const id = `${key}:${spec.kind}:${spec.tile}:${color}:${spec.accent}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("无法创建纹理");
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  (PAINT[spec.kind] ?? PAINT.linen)(g, rng(seed), color, spec.accent);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(id, tex);
  return tex;
}

export function worldUV(geometry: THREE.BufferGeometry, tileM: number, offset: [number, number, number] = [0, 0, 0]) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  if (!uv || !nor) return geometry;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset[0];
    const y = pos.getY(i) + offset[1];
    const z = pos.getZ(i) + offset[2];
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, z / tileM, y / tileM);
    else if (ay >= az) uv.setXY(i, x / tileM, z / tileM);
    else uv.setXY(i, x / tileM, y / tileM);
  }
  uv.needsUpdate = true;
  return geometry;
}
