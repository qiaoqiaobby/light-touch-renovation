import { BATH_STUB, DOORS, ROOMS, type Door, type Pt, type Room } from "./plan-data";

export type Opening = {
  a0: number;
  a1: number;
  kind: "door" | "window";
  /** Metres from the floor. */
  sill: number;
  head: number;
  doorId?: string;
};

export type Wall = {
  id: string;
  axis: "h" | "v";
  /** Along-wall extent, millimetres (x if h, y if v). */
  a0: number;
  a1: number;
  /** Perpendicular extent, the wall thickness. */
  f0: number;
  f1: number;
  kind: "ext" | "int" | "stub";
  openings: Opening[];
};

export type Collider = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  holes: { x0: number; z0: number; x1: number; z1: number; id: string }[];
};

const EXT = 240;
const SEAL = 10;

function signedArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function outward(a: Pt, b: Pt, sa: number): [number, number] {
  let nx = b[1] - a[1];
  let ny = -(b[0] - a[0]);
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if (sa < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
}

type Edge = {
  room: string;
  axis: "h" | "v";
  fixed: number;
  a0: number;
  a1: number;
  out: 1 | -1;
  glass: boolean;
  sill: number;
  convex0: boolean;
  convex1: boolean;
};

function edgesOf(room: Room): Edge[] {
  const poly = room.poly;
  const sa = signedArea(poly);
  const glass = new Map(room.glass.map((g) => [g.edge, g.sill]));
  const n = poly.length;
  const out: Edge[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const prev = poly[(i - 1 + n) % n];
    const next = poly[(i + 2) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (Math.hypot(dx, dy) < 20) continue;
    const axis: "h" | "v" = Math.abs(dy) < 2 ? "h" : "v";
    if (axis === "h" && Math.abs(dy) >= 2) continue;
    if (axis === "v" && Math.abs(dx) >= 2) continue;
    const [nx, ny] = outward(a, b, sa);
    const cross = (c: Pt, d: Pt, e: Pt) => (d[0] - c[0]) * (e[1] - d[1]) - (d[1] - c[1]) * (e[0] - d[0]);
    const convexStart = cross(prev, a, b) * sa > 50;
    const convexEnd = cross(a, b, next) * sa > 50;
    const along0 = axis === "h" ? a[0] : a[1];
    const along1 = axis === "h" ? b[0] : b[1];
    const fixed = axis === "h" ? a[1] : a[0];
    const dir = axis === "h" ? ny : nx;
    out.push({
      room: room.id,
      axis,
      fixed,
      a0: Math.min(along0, along1),
      a1: Math.max(along0, along1),
      out: dir >= 0 ? 1 : -1,
      glass: glass.has(i),
      sill: glass.get(i) ?? 0.9,
      convex0: along0 < along1 ? convexStart : convexEnd,
      convex1: along0 < along1 ? convexEnd : convexStart,
    });
  }
  return out;
}

function areaM2(poly: Pt[]) {
  return Math.abs(signedArea(poly)) / 1e6;
}

export function pointInPoly(x: number, y: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function bboxOf(rooms: Room[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rooms) {
    for (const [x, y] of r.poly) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

export const BBOX = bboxOf(ROOMS);
export const OX = (BBOX.minX + BBOX.maxX) / 2;
export const OY = (BBOX.minY + BBOX.maxY) / 2;
export const wx = (x: number) => (x - OX) / 1000;
export const wz = (y: number) => (y - OY) / 1000;

export function planArea(id: string) {
  const r = ROOMS.find((room) => room.id === id);
  return r ? areaM2(r.poly) : 0;
}

type Piece = Edge;

function subtract(p: Piece, o0: number, o1: number): Piece[] {
  const next: Piece[] = [];
  if (p.a0 < o0 - 1) {
    next.push({ ...p, a1: Math.min(p.a1, o0), convex1: false });
  }
  if (p.a1 > o1 + 1) {
    next.push({ ...p, a0: Math.max(p.a0, o1), convex0: false });
  }
  return next.filter((q) => q.a1 - q.a0 > 25);
}

function pairPieces(pieces: Piece[], minDist: number, maxDist: number, makeWall: boolean, walls: Wall[]) {
  let guard = 0;
  while (guard++ < 400) {
    let best: { i: number; j: number; o0: number; o1: number; len: number } | null = null;
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];
        if (a.axis !== b.axis || a.out === b.out || a.room === b.room) continue;
        const dist = (b.fixed - a.fixed) * a.out;
        if (dist < minDist || dist > maxDist) continue;
        const o0 = Math.max(a.a0, b.a0);
        const o1 = Math.min(a.a1, b.a1);
        const len = o1 - o0;
        if (len < 50) continue;
        if (!best || len > best.len) best = { i, j, o0, o1, len };
      }
    }
    if (!best) break;
    const a = pieces[best.i];
    const b = pieces[best.j];
    if (makeWall) {
      const f0 = Math.min(a.fixed, b.fixed) - SEAL;
      const f1 = Math.max(a.fixed, b.fixed) + SEAL;
      walls.push({
        id: `int-${walls.length}`,
        axis: a.axis,
        a0: best.o0,
        a1: best.o1,
        f0,
        f1,
        kind: "int",
        openings: [],
      });
    }
    const next: Piece[] = [];
    pieces.forEach((p, idx) => {
      if (idx === best!.i || idx === best!.j) next.push(...subtract(p, best!.o0, best!.o1));
      else next.push(p);
    });
    pieces = next;
  }
  return pieces;
}

function exteriorOf(p: Piece, index: number): Wall {
  const t = EXT;
  let a0 = p.a0;
  let a1 = p.a1;
  if (p.convex0) a0 -= t;
  if (p.convex1) a1 += t;
  const f0 = p.out > 0 ? p.fixed - SEAL : p.fixed - t;
  const f1 = p.out > 0 ? p.fixed + t : p.fixed + SEAL;
  const openings: Opening[] = [];
  if (p.glass && p.a1 - p.a0 > 420) {
    const jamb = Math.min(180, (p.a1 - p.a0) * 0.12);
    openings.push({
      a0: p.a0 + jamb,
      a1: p.a1 - jamb,
      kind: "window",
      sill: p.sill,
      head: 2.15,
    });
  }
  return {
    id: `ext-${index}`,
    axis: p.axis,
    a0,
    a1,
    f0,
    f1,
    kind: "ext",
    openings,
  };
}

function overlap(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function attachDoors(walls: Wall[]) {
  for (const door of DOORS) {
    const j0 = Math.min(door.j[0], door.j[1]);
    const j1 = Math.max(door.j[0], door.j[1]);
    const w0 = Math.min(door.w[0], door.w[1]);
    const w1 = Math.max(door.w[0], door.w[1]);
    let best: { wall: Wall; score: number } | null = null;
    for (const wall of walls) {
      if (wall.axis !== door.axis || wall.kind === "stub") continue;
      const along = overlap(wall.a0, wall.a1, j0, j1);
      const thick = overlap(wall.f0, wall.f1, w0, w1);
      if (along < door.width * 0.62 || thick < 40) continue;
      const score = along + thick;
      if (!best || score > best.score) best = { wall, score };
    }
    if (!best) continue;
    const wall = best.wall;
    const a0 = Math.max(wall.a0, j0);
    const a1 = Math.min(wall.a1, j1);
    wall.openings = wall.openings.filter((o) => overlap(o.a0, o.a1, a0, a1) < 30);
    wall.openings.push({
      a0,
      a1,
      kind: "door",
      sill: 0,
      head: door.head,
      doorId: door.id,
    });
  }
}

export function buildWalls(): Wall[] {
  let pieces = ROOMS.flatMap(edgesOf);
  const walls: Wall[] = [];
  pieces = pairPieces(pieces, 60, 300, true, walls);
  pieces = pairPieces(pieces, -8, 60, false, walls);
  pieces.forEach((p, i) => {
    if (p.a1 - p.a0 < 40) return;
    walls.push(exteriorOf(p, i));
  });
  const [sx0, sy0, sx1, sy1] = BATH_STUB;
  walls.push({
    id: "stub",
    axis: "v",
    a0: sy0,
    a1: sy1,
    f0: sx0,
    f1: sx1,
    kind: "stub",
    openings: [],
  });
  attachDoors(walls);
  return walls;
}

export function wallCenterInsideRoom(wall: Wall): string | null {
  const ac = (wall.a0 + wall.a1) / 2;
  const fc = (wall.f0 + wall.f1) / 2;
  const x = wall.axis === "h" ? ac : fc;
  const y = wall.axis === "h" ? fc : ac;
  for (const r of ROOMS) {
    if (pointInPoly(x, y, r.poly)) return r.id;
  }
  return null;
}

export function collidersFrom(walls: Wall[]): Collider[] {
  return walls.map((wall) => {
    const x0 = wx(wall.axis === "h" ? wall.a0 : wall.f0);
    const x1 = wx(wall.axis === "h" ? wall.a1 : wall.f1);
    const z0 = wz(wall.axis === "h" ? wall.f0 : wall.a0);
    const z1 = wz(wall.axis === "h" ? wall.f1 : wall.a1);
    const holes = wall.openings
      .filter((o) => o.kind === "door" && o.doorId)
      .map((o) => {
        const hx0 = wx(wall.axis === "h" ? o.a0 : wall.f0);
        const hx1 = wx(wall.axis === "h" ? o.a1 : wall.f1);
        const hz0 = wz(wall.axis === "h" ? wall.f0 : o.a0);
        const hz1 = wz(wall.axis === "h" ? wall.f1 : o.a1);
        return {
          x0: Math.min(hx0, hx1),
          x1: Math.max(hx0, hx1),
          z0: Math.min(hz0, hz1),
          z1: Math.max(hz0, hz1),
          id: o.doorId!,
        };
      });
    return {
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
      holes,
    };
  });
}

/** Leaf local +X aims along (dx, dy) in plan when rotation.y = this angle. */
export function angleForPlanDir(dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  return Math.atan2(-dy / len, dx / len);
}

export function doorMotion(door: Door) {
  const across = (door.w[0] + door.w[1]) / 2;
  const hinge: Pt = door.axis === "h" ? [door.j[1], across] : [across, door.j[1]];
  const into = door.into ?? -1;
  const closed = door.axis === "h" ? { dx: door.j[0] - door.j[1], dy: 0 } : { dx: 0, dy: door.j[0] - door.j[1] };
  const open = door.axis === "h" ? { dx: 0, dy: into } : { dx: into, dy: 0 };
  let closedA = angleForPlanDir(closed.dx, closed.dy);
  let openA = angleForPlanDir(open.dx, open.dy);
  while (openA - closedA > Math.PI) openA -= Math.PI * 2;
  while (closedA - openA > Math.PI) openA += Math.PI * 2;
  return { hinge, closed: closedA, open: openA };
}

export function roomCenter(room: Room): Pt {
  let x = 0;
  let y = 0;
  for (const p of room.poly) {
    x += p[0];
    y += p[1];
  }
  return [x / room.poly.length, y / room.poly.length];
}

let cached: Wall[] | null = null;
export function walls(): Wall[] {
  if (!cached) cached = buildWalls();
  return cached;
}
