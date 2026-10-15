export type Rect = { x: number; y: number; w: number; d: number };

export function overlap1(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

export function intersects(a: Rect, b: Rect) {
  return overlap1(a.x, a.x + a.w, b.x, b.x + b.w) > 0 && overlap1(a.y, a.y + a.d, b.y, b.y + b.d) > 0;
}

export function distPointRect(px: number, py: number, r: Rect) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.d));
  return Math.hypot(dx, dy);
}

export type AxisEdge = { axis: "h" | "v"; fixed: number; a0: number; a1: number; index: number };

export function axisEdges(poly: [number, number][]): AxisEdge[] {
  const out: AxisEdge[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (Math.hypot(dx, dy) < 20) continue;
    if (Math.abs(dy) < 2) out.push({ axis: "h", fixed: a[1], a0: Math.min(a[0], b[0]), a1: Math.max(a[0], b[0]), index: i });
    else if (Math.abs(dx) < 2) out.push({ axis: "v", fixed: a[0], a0: Math.min(a[1], b[1]), a1: Math.max(a[1], b[1]), index: i });
  }
  return out;
}
