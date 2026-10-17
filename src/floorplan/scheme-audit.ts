/**
 * 三方案放到复尺客厅后的检查。摆放数据在 living-schemes.ts。
 * 空跑防护：墙外加一块，必须被「在房间内」捕获。
 */
import { ROOMS } from "./plan-data";
import { pointInPoly } from "./geometry";
import { SCENES, SCHEMES, resolvePieces, type Piece, type Scene } from "./living-schemes";
import { screenGap, throwDistance, viewDistance, westAisle } from "./scheme-metrics";

const poly = ROOMS.find((r) => r.id === "L")!.poly;

function overlap(a: Piece, b: Piece) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
}

function inside(p: Piece) {
  const inset = 12;
  const pts: [number, number][] = [
    [p.x + p.w / 2, p.y + p.d / 2],
    [p.x + inset, p.y + inset],
    [p.x + p.w - inset, p.y + inset],
    [p.x + p.w - inset, p.y + p.d - inset],
    [p.x + inset, p.y + p.d - inset],
  ];
  return pts.every(([x, y]) => pointInPoly(x, y, poly));
}

function accessRect(p: Piece): Piece | null {
  if (!p.access) return null;
  const { side, depth } = p.access;
  if (side === "n") return { ...p, y: p.y - depth, d: depth };
  if (side === "s") return { ...p, y: p.y + p.d, d: depth };
  if (side === "w") return { ...p, x: p.x - depth, w: depth };
  return { ...p, x: p.x + p.w, w: depth };
}

const START = { name: "入户", x: 6400, y: 12720 };
const TARGETS = [
  { name: "厨房门", x: 7720, y: 12880 },
  { name: "卫生间门", x: 6240, y: 11420 },
  { name: "北侧过道", x: 4900, y: 6900 },
];

function stand(cx: number, cy: number, blocks: Piece[]) {
  const h = 400;
  const corners: [number, number][] = [
    [cx - h, cy - h],
    [cx + h, cy - h],
    [cx + h, cy + h],
    [cx - h, cy + h],
  ];
  if (!corners.every(([x, y]) => pointInPoly(x, y, poly))) return false;
  const body = { x: cx - h, y: cy - h, w: 800, d: 800 } as Piece;
  return !blocks.some((b) => overlap(body, b));
}

function reachable(blocks: Piece[]) {
  if (!stand(START.x, START.y, blocks)) return ["起点站不住"];
  const seen = new Set<string>();
  const q: [number, number][] = [[START.x, START.y]];
  const key = (x: number, y: number) => `${x},${y}`;
  seen.add(key(START.x, START.y));
  const step = 200;
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || !stand(nx, ny, blocks)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return TARGETS.filter((t) => ![...seen].some((k) => {
    const [x, y] = k.split(",").map(Number);
    return Math.hypot(x - t.x, y - t.y) <= 200 && stand(t.x, t.y, blocks);
  })).map((t) => t.name);
}

function clearSpot(zone: { x: number; y: number; w: number; d: number }, solids: Piece[]) {
  const cell = 100;
  for (const [rw, rd] of [
    [2000, 1000],
    [1000, 2000],
  ]) {
    for (let y = zone.y; y + rd <= zone.y + zone.d; y += cell) {
      for (let x = zone.x; x + rw <= zone.x + zone.w; x += cell) {
        const rect = { x, y, w: rw, d: rd } as Piece;
        const hit = solids.some((s) => overlap(rect, s));
        const boxIn = inside({ ...rect, id: "spot", name: "spot", type: "block", h: 1, color: "#000" });
        if (!hit && boxIn) return true;
      }
    }
  }
  return false;
}

export function layoutProblems(items: Piece[], zone?: { x: number; y: number; w: number; d: number }, scene?: Scene) {
  const problems: string[] = [];
  for (const p of items) {
    if (!inside(p)) problems.push(`${p.name} 不在房间内`);
  }
  const solids = items.filter((p) => (p.mount ?? "floor") === "floor" && !p.cover);
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      if (overlap(solids[i], solids[j])) problems.push(`${solids[i].name}×${solids[j].name}`);
    }
  }
  for (const p of solids) {
    const zoneBox = accessRect(p);
    if (!zoneBox) continue;
    if (!inside(zoneBox)) problems.push(`${p.name} 门前越出房间`);
    for (const o of solids) {
      if (o !== p && overlap(zoneBox, o)) problems.push(`${p.name} 门前被 ${o.name} 占用`);
    }
  }
  const blockers = items.filter((p) => (p.mount ?? "floor") === "floor" && (!p.cover || p.occupied));
  const miss = reachable(blockers);
  if (miss.length) problems.push(`走不到 ${miss.join("、")}`);
  if (scene === "exercise" && zone) {
    if (!clearSpot(zone, solids)) problems.push("运动区没有 2000×1000 空地");
    const mat = items.find((p) => p.occupied);
    const inZone =
      mat &&
      mat.x >= zone.x &&
      mat.y >= zone.y &&
      mat.x + mat.w <= zone.x + zone.w &&
      mat.y + mat.d <= zone.y + zone.d;
    if (!inZone) problems.push("瑜伽垫不在运动区");
  }
  if (scene === "party" || scene === "dine2") {
    const seats = items.reduce((sum, p) => sum + (p.seat ?? 0), 0);
    const need = scene === "party" ? 6 : 2;
    if (seats < need) problems.push(`餐座 ${seats}，需要 ${need}`);
  }
  return problems;
}

export function runSchemeAudit() {
  const lines: string[] = [];
  const emptyMiss = reachable([]);
  if (emptyMiss.length) throw new Error(`空屋路线失败：${emptyMiss.join("、")}`);
  for (const scheme of SCHEMES) {
    for (const scene of SCENES) {
      const items = resolvePieces(scheme, scene.id);
      const problems = layoutProblems(items, scheme.zone, scene.id);
      if (problems.length) {
        throw new Error(`${scheme.label} / ${scene.label}：${problems.join("；")}`);
      }
      lines.push(`${scheme.label} / ${scene.label} 通过（${items.length} 件）`);
    }
  }
  const view = viewDistance();
  const aisle = westAisle();
  const gap = screenGap();
  if (view < 2000 || view > 2600) throw new Error(`方案一观看距离 ${view} mm，应在 2000–2600`);
  if (aisle < 800 || aisle > 1200) throw new Error(`方案二西侧通道 ${aisle} mm，应在 800–1200`);
  if (gap < 1400 || gap > 1800) throw new Error(`方案二幕布距离 ${gap} mm，应在 1400–1800`);
  const outsider: Piece = {
    id: "bad",
    name: "墙外块",
    type: "block",
    x: 9000,
    y: 8000,
    w: 400,
    d: 400,
    h: 400,
    color: "#000",
  };
  const caught = layoutProblems([...resolvePieces(SCHEMES[0], "daily"), outsider], SCHEMES[0].zone, "daily");
  if (!caught.some((p) => p.includes("不在房间内"))) throw new Error("变异未捕获：墙外块");
  lines.push(`方案一观看距离 ${view} mm`);
  lines.push(`方案二西侧通道 ${aisle} mm`);
  const throw3 = throwDistance();
  lines.push(`方案二幕布距离 ${gap} mm`);
  lines.push(`方案三投影距离 ${throw3} mm`);
  lines.push("变异 1 项：墙外块被「在房间内」捕获");
  console.log(lines.join("\n"));
}

runSchemeAudit();
