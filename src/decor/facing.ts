import type { DecorItem, Facing } from "./types";
import { axisEdges, overlap1, type Rect } from "./geom";

type Side = "n" | "e" | "s" | "w";
const ORDER: Side[] = ["n", "e", "s", "w"];
const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };

function sideDist(item: Rect, side: Side, edges: ReturnType<typeof axisEdges>) {
  let best = Infinity;
  if (side === "n" || side === "s") {
    const y = side === "n" ? item.y : item.y + item.d;
    for (const e of edges) {
      if (e.axis === "h" && overlap1(item.x, item.x + item.w, e.a0, e.a1) > 0) best = Math.min(best, Math.abs(e.fixed - y));
    }
  } else {
    const x = side === "w" ? item.x : item.x + item.w;
    for (const e of edges) {
      if (e.axis === "v" && overlap1(item.y, item.y + item.d, e.a0, e.a1) > 0) best = Math.min(best, Math.abs(e.fixed - x));
    }
  }
  return best;
}

function nearest(item: Rect, sides: Side[], edges: ReturnType<typeof axisEdges>): Side {
  let best: Side = sides[0];
  let dist = Infinity;
  for (const side of ORDER) {
    if (!sides.includes(side)) continue;
    const d = sideDist(item, side, edges);
    if (d < dist - 0.5) {
      dist = d;
      best = side;
    }
  }
  return best;
}

function toward(from: Rect, to: Rect): Facing {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.d / 2 - (from.y + from.d / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "e" : "w";
  return dy >= 0 ? "s" : "n";
}

export type FacingKind = "sofa" | "bed" | "chair" | "cabinet" | "none";

export function facingOf(
  item: Rect,
  poly: [number, number][],
  others: { id: string; rect: Rect; kind: string }[],
  kind: FacingKind,
  tuck?: string,
  seat = false,
): Facing {
  if (kind === "none") return null;
  const edges = axisEdges(poly);
  if (kind === "chair" && tuck) {
    const host = others.find((o) => o.id === tuck);
    if (host) return toward(item, host.rect);
  }
  if (kind === "chair" && seat) {
    let best: { id: string; rect: Rect } | null = null;
    let dist = Infinity;
    const c = { x: item.x + item.w / 2, y: item.y + item.d / 2 };
    for (const o of others) {
      if (o.kind !== "table" && o.kind !== "desk") continue;
      const d = Math.hypot(o.rect.x + o.rect.w / 2 - c.x, o.rect.y + o.rect.d / 2 - c.y);
      if (d < dist) {
        dist = d;
        best = o;
      }
    }
    if (best) return toward(item, best.rect);
  }
  const long: Side[] = item.w >= item.d ? ["n", "s"] : ["e", "w"];
  const short: Side[] = item.w >= item.d ? ["e", "w"] : ["n", "s"];
  if (kind === "sofa") return OPPOSITE[nearest(item, long, edges)];
  if (kind === "bed") return OPPOSITE[nearest(item, short, edges)];
  return OPPOSITE[nearest(item, ORDER, edges)];
}

export function headSide(item: Rect, poly: [number, number][]): Side {
  const edges = axisEdges(poly);
  const short: Side[] = item.w >= item.d ? ["e", "w"] : ["n", "s"];
  return nearest(item, short, edges);
}

export function facingKindOf(item: Pick<DecorItem, "model" | "key" | "variant">, schemeShelf: boolean): FacingKind {
  if (schemeShelf && item.key === "shelf") return "none";
  if (["rug", "cushionSill", "yogaMat", "stool", "sillBlock"].includes(item.model)) return "none";
  if (item.model === "sideTable" && item.variant === "round") return "none";
  if (item.model === "sofa" || item.model === "daybed") return "sofa";
  if (item.model === "bed") return "bed";
  if (item.model.startsWith("chair") || item.model === "loungeRocker" || item.model === "clubChair") return "chair";
  return "cabinet";
}
