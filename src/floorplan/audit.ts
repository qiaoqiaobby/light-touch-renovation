import { DOORS, FURNITURE, ROOMS, SPAWN } from "./plan-data";
import {
  buildWalls,
  planArea,
  pointInPoly,
  wallCenterInsideRoom,
  walls,
  wx,
  wz,
} from "./geometry";

function corners(f: (typeof FURNITURE)[number]) {
  const t = (-f.rot * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const pts: [number, number][] = [];
  for (const lx of [-f.w / 2, f.w / 2]) {
    for (const lz of [-f.d / 2, f.d / 2]) {
      const dx = lx * c + lz * s;
      const dy = -lx * s + lz * c;
      const len = Math.hypot(dx, dy) || 1;
      pts.push([f.cx + dx - (dx / len) * 35, f.cy + dy - (dy / len) * 35]);
    }
  }
  return pts;
}

export function runAudit() {
  const built = buildWalls();
  const lines: string[] = [];
  for (const r of ROOMS) {
    lines.push(`area ${r.id} ${planArea(r.id).toFixed(2)} label ${r.label}`);
  }
  lines.push(`walls ${built.length}`);
  const inside: string[] = [];
  for (const w of built) {
    if (w.kind === "stub") continue;
    const hit = wallCenterInsideRoom(w);
    if (hit) inside.push(`${w.id} in ${hit} len ${Math.round(w.a1 - w.a0)}`);
  }
  lines.push(`centers inside rooms: ${inside.length ? inside.join(" | ") : "none"}`);
  const missing = DOORS.filter((d) => !built.some((w) => w.openings.some((o) => o.doorId === d.id)));
  lines.push(`doors missing: ${missing.map((d) => d.id).join(",") || "none"}`);
  const furnBad: string[] = [];
  for (const f of FURNITURE) {
    const room = ROOMS.find((r) => r.id === f.room)!;
    for (const [x, y] of corners(f)) {
      if (!pointInPoly(x, y, room.poly)) {
        furnBad.push(`${f.id} @ ${Math.round(x)},${Math.round(y)}`);
        break;
      }
    }
  }
  lines.push(`furniture outside: ${furnBad.join(" | ") || "none"}`);
  const [sx, sy] = SPAWN;
  const spawnRoom = ROOMS.find((r) => pointInPoly(sx, sy, r.poly));
  lines.push(`spawn ${spawnRoom?.id ?? "OUTSIDE"} world ${wx(sx).toFixed(2)},${wz(sy).toFixed(2)}`);
  const glass = built.filter((w) => w.openings.some((o) => o.kind === "window")).length;
  lines.push(`window walls ${glass}`);
  console.log(lines.join("\n"));
  if (inside.length || missing.length || furnBad.length || !spawnRoom) {
    throw new Error("audit failed");
  }
}

runAudit();
