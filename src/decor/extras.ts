import { ROOMS } from "../floorplan/plan-data";
import { pointInPoly } from "../floorplan/geometry";
import { intersects, type Rect } from "./geom";
import type { RoomId } from "./types";

/** 拼贴板没有、但三维需要的现状件。位置由旧壳换算，待现场复核。 */
export const FIXED_EXTRA: {
  id: string;
  room: RoomId;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z: number;
  mount: "floor" | "wall";
  model: string;
  finish: string;
}[] = [
  { id: "l-sill", room: "L", name: "客厅飘窗台", x: 5993, y: 5473, w: 2530, d: 760, h: 450, z: 0, mount: "floor", model: "sillBlock", finish: "sillStone" },
  { id: "k-wall", room: "K", name: "厨房东墙吊柜", x: 10024, y: 11938, w: 350, d: 2496, z: 1600, h: 700, mount: "wall", model: "block", finish: "kitblue" },
  { id: "k-hood", room: "K", name: "油烟机", x: 9076, y: 14084, w: 600, d: 350, z: 1600, h: 500, mount: "wall", model: "block", finish: "steel" },
  { id: "k-heater", room: "K", name: "燃气热水器", x: 10174, y: 10054, w: 200, d: 400, z: 1500, h: 650, mount: "wall", model: "block", finish: "appliance" },
  { id: "a-ac", room: "A", name: "卧室 A 挂机空调", x: 2263, y: 1000, w: 200, d: 800, z: 2200, h: 300, mount: "wall", model: "block", finish: "appliance" },
  { id: "b-ac", room: "B", name: "卧室 B 挂机空调", x: 1009, y: 5677, w: 200, d: 800, z: 2200, h: 300, mount: "wall", model: "block", finish: "appliance" },
];

export const CEILING_POINTS: { room: RoomId; at: [number, number] }[] = [
  { room: "L", at: [7224, 8357] },
  { room: "L", at: [7224, 10827] },
  { room: "E", at: [6500, 12950] },
  { room: "A", at: [3814, 2760] },
  { room: "B", at: [2563, 6111] },
  { room: "C", at: [4060, 8938] },
  { room: "K", at: [9700, 11500] },
  { room: "Bath", at: [3600, 11150] },
];

export type CurtainSpec = {
  id: string;
  room: RoomId;
  x: number;
  y: number;
  w: number;
  d: number;
  z: number;
  h: number;
  model: "curtain" | "blind";
};

const BAY = new Set(["L:0", "A:0", "B:0", "B:9"]);

function inward(poly: [number, number][], i: number, dist: number) {
  const a = poly[i];
  const b = poly[(i + 1) % poly.length];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (!pointInPoly(mx + nx * dist, my + ny * dist, poly)) {
    nx = -nx;
    ny = -ny;
  }
  return { a, b, nx, ny, len };
}

/** 窗帘内移 60 mm 后若与任一方案 L3 落地件相交，或房间是厨房，就改成窗洞内卷帘。 */
export function curtainSpecs(floor: Rect[]): CurtainSpec[] {
  const out: CurtainSpec[] = [];
  for (const room of ROOMS) {
    const poly = room.poly as [number, number][];
    room.glass.forEach((glass, nth) => {
      const i = glass.edge;
      const { a, b, nx, ny, len } = inward(poly, i, 60);
      const horizontal = Math.abs(a[1] - b[1]) < 2;
      const x0 = Math.min(a[0], b[0]);
      const y0 = Math.min(a[1], b[1]);
      const cx = (a[0] + b[0]) / 2 + nx * 60;
      const cy = (a[1] + b[1]) / 2 + ny * 60;
      const cloth: Rect = horizontal
        ? { x: x0, y: cy - 40, w: len, d: 80 }
        : { x: cx - 40, y: y0, w: 80, d: len };
      const hit = floor.some((r) => intersects(cloth, r));
      const blind = room.id === "K" || hit;
      const sillMm = glass.sill * 1000;
      const bay = BAY.has(`${room.id}:${i}`) || sillMm > 300;
      if (blind) {
        const spec: Rect = horizontal
          ? { x: x0, y: (a[1] + b[1]) / 2 - 20, w: len, d: 40 }
          : { x: (a[0] + b[0]) / 2 - 20, y: y0, w: 40, d: len };
        out.push({ id: `blind-${room.id}-${nth}`, room: room.id as RoomId, ...spec, z: 1550, h: 600, model: "blind" });
      } else {
        const bottom = bay ? sillMm + 10 : 20;
        out.push({
          id: `curtain-${room.id}-${nth}`,
          room: room.id as RoomId,
          ...cloth,
          z: bottom,
          h: 2670 - bottom,
          model: "curtain",
        });
      }
    });
  }
  return out;
}
