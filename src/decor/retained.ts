import type { MatSpec } from "./types";

/**
 * VR 取样色。来源：mid/jalo/crops/crops.json 各 base-* 的 palette[0]，2026-10-15 取样。
 * 全景白墙偏冷，进场景前先做白平衡。
 */
export const RAW_HEX = {
  tile: "#a1a49d",
  wall: "#f1fefe",
  ceiling: "#fffffd",
  blue: "#7da7c7",
  redwood: "#6d3824",
  cabwhite: "#fbfbfb",
  kitblue: "#488bb7",
  bedfloor: "#b5b0a1",
} as const;

function hexToLin(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
}

function linToHex(rgb: [number, number, number]): string {
  const ch = (c: number) => {
    const x = Math.min(1, Math.max(0, c));
    const s = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, s)) * 255);
  };
  return (
    "#" +
    rgb
      .map(ch)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** 以白墙线性三通道的均值为目标，把增益乘到取样色上。 */
export function whiteBalance(hex: string): string {
  const wall = hexToLin(RAW_HEX.wall);
  const mean = (wall[0] + wall[1] + wall[2]) / 3;
  const gain = wall.map((c) => mean / c) as [number, number, number];
  const v = hexToLin(hex);
  return linToHex([v[0] * gain[0], v[1] * gain[1], v[2] * gain[2]]);
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

export const RETAINED_HEX: Record<keyof typeof RAW_HEX, string> = {
  tile: whiteBalance(RAW_HEX.tile),
  wall: whiteBalance(RAW_HEX.wall),
  ceiling: whiteBalance(RAW_HEX.ceiling),
  blue: whiteBalance(RAW_HEX.blue),
  redwood: whiteBalance(RAW_HEX.redwood),
  cabwhite: whiteBalance(RAW_HEX.cabwhite),
  kitblue: whiteBalance(RAW_HEX.kitblue),
  bedfloor: whiteBalance(RAW_HEX.bedfloor),
};

const tile = RETAINED_HEX.tile;

export const EXISTING: Record<string, MatSpec> = {
  tile: { hex: tile, rough: 0.2, tex: { kind: "tile", tile: 800, accent: shade(tile, 0.94) } },
  wall: { hex: RETAINED_HEX.wall, rough: 0.92 },
  ceiling: { hex: RETAINED_HEX.ceiling, rough: 0.95 },
  blue: { hex: RETAINED_HEX.blue, rough: 0.6, tex: { kind: "stripe", tile: 120, accent: shade(RETAINED_HEX.blue, 0.85) } },
  redwood: { hex: RETAINED_HEX.redwood, rough: 0.5, tex: { kind: "wood", tile: 900, accent: shade(RETAINED_HEX.redwood, 0.82) } },
  cabwhite: { hex: RETAINED_HEX.cabwhite, rough: 0.45 },
  kitblue: { hex: RETAINED_HEX.kitblue, rough: 0.3 },
  bedfloor: { hex: RETAINED_HEX.bedfloor, rough: 0.6, tex: { kind: "planks", tile: 1200, accent: shade(RETAINED_HEX.bedfloor, 0.82) } },
  wetTile: { hex: "#cfd0cd", rough: 0.3, tex: { kind: "tile", tile: 300, accent: "#b7b8b4" }, neutralExempt: true },
  wallCeramic: { hex: "#e9e9e6", rough: 0.25, tex: { kind: "ceramic", tile: 600, accent: "#c8c8c4" }, neutralExempt: true },
  counterStone: { hex: "#8f8a82", rough: 0.35, neutralExempt: true },
  doorWhite: { hex: "#efeee9", rough: 0.5, neutralExempt: true },
  doorEntry: { hex: "#5a3424", rough: 0.5, neutralExempt: true },
  sillStone: { hex: "#e9e7e2", rough: 0.35, neutralExempt: true },
  appliance: { hex: "#f4f4f2", rough: 0.35, neutralExempt: true },
  steel: { hex: "#b9bcbe", rough: 0.35, metal: 0.7, neutralExempt: true },
  ceramicWhite: { hex: "#f3f3f1", rough: 0.15, neutralExempt: true },
  glass: { hex: "#cfdde6", rough: 0.08, opacity: 0.25, neutralExempt: true },
};
