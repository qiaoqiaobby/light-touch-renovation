/**
 * 平面图。移植自 boards/src/main.js 的 plan()，逻辑一致：房间轮廓、窗、门扇、现状固定件、物件、编号、尺寸线。
 * 坐标是毫米，viewBox 直接用毫米；文字按显示宽度换算，屏幕上不小于 12 px。
 */
import { useEffect, useId, useRef, useState } from "react";
import { doorSweep, doorZone } from "../../../boards/src/metrics.mjs";
import { DOORS, FIXED, type Fixed, type Mount, type Room } from "../data";

export type PlanPiece = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  mount?: Mount;
  fill?: string | null;
  soft?: boolean;
  num?: number;
};
export type PlanDim = { a: [number, number]; b: [number, number]; text: string };
export type PlanLabel = { x: number; y: number; text: string };

type Props = {
  rooms: Room[];
  view: [number, number, number, number];
  pieces: PlanPiece[];
  label: string;
  dims?: PlanDim[];
  labels?: PlanLabel[];
  hot?: string | null;
  onHot?: (id: string | null) => void;
  mini?: boolean;
};

/** 屏幕上 12 px 对应多少毫米。 */
function useUnit(width: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [unit, setUnit] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const px = el.getBoundingClientRect().width;
      if (px) setUnit(width / px);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return [ref, unit] as const;
}

function doorsFor(rooms: Room[]) {
  const out: { id: string; kind: "arc" | "line"; d: string; x1: number; y1: number; x2: number; y2: number; slide: boolean }[] = [];
  for (const d of DOORS) {
    const served = rooms.find((r) => doorZone(d, r.poly));
    if (!served) continue;
    const swingRoom = d.kind === "swing" ? rooms.find((r) => doorSweep(d, r.poly)) : null;
    if (swingRoom) {
      const { cx, cy, r, qx, qy } = doorSweep(d, swingRoom.poly)!;
      const open = d.axis === "h" ? [cx, cy + qy * r] : [cx + qx * r, cy];
      const shut = d.axis === "h" ? [cx + qx * r, cy] : [cx, cy + qy * r];
      const flag = (open[0] - cx) * (shut[1] - cy) - (open[1] - cy) * (shut[0] - cx) > 0 ? 1 : 0;
      out.push({ id: d.id, kind: "arc", d: `M${open[0]},${open[1]} A${r},${r} 0 0 ${flag} ${shut[0]},${shut[1]}`, x1: cx, y1: cy, x2: open[0], y2: open[1], slide: false });
    } else {
      // 推拉门画粗线；向相邻房间开的平开门，这张图上只画门洞
      const [j0, j1] = d.j;
      const mid = (d.w[0] + d.w[1]) / 2;
      const p = d.axis === "h" ? [[j0, mid], [j1, mid]] : [[mid, j0], [mid, j1]];
      out.push({ id: d.id, kind: "line", d: "", x1: p[0][0], y1: p[0][1], x2: p[1][0], y2: p[1][1], slide: d.kind === "slide" });
    }
  }
  return out;
}

const sw = (px: number) => ({ strokeWidth: px, vectorEffect: "non-scaling-stroke" as const });

export function Plan({ rooms, view, pieces, label, dims = [], labels = [], hot = null, onHot, mini = false }: Props) {
  const [x0, y0, x1, y1] = view;
  const [ref, unit] = useUnit(x1 - x0);
  const hatch = useId().replace(/:/g, "");
  const fs = 12 * unit;
  const ids = rooms.map((r) => r.id);
  const fixed: Fixed[] = FIXED.filter((f) => ids.includes(f.room));
  const enter = (id: string) => () => onHot?.(id);
  const leave = () => onHot?.(null);

  return (
    <svg ref={ref} className={`plan-svg${mini ? " mini" : ""}`} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} role="img" aria-label={label}>
      <defs>
        <pattern id={hatch} width={80} height={80} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect className="hatch-bg" width={80} height={80} />
          <line className="hatch-line" x1={0} y1={0} x2={0} y2={80} strokeWidth={14} />
        </pattern>
      </defs>
      {rooms.map((r) => (
        <g key={r.id}>
          <polygon className="room" points={r.poly.map((p) => p.join(",")).join(" ")} {...sw(1.5)} />
          {(r.glass ?? []).map((g) => {
            const a = r.poly[g.edge];
            const b = r.poly[(g.edge + 1) % r.poly.length];
            return <line key={g.edge} className="glass" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...sw(5)} />;
          })}
        </g>
      ))}
      {doorsFor(rooms).map((d) =>
        d.kind === "arc" ? (
          <g key={d.id}>
            <line className="door" x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} {...sw(2)} />
            <path className="door door-arc" d={d.d} {...sw(1)} />
          </g>
        ) : (
          <line key={d.id} className="door" x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} {...sw(d.slide ? 4 : 2)} />
        ),
      )}
      {fixed.map((f) => (
        <rect key={f.id} className={`fixed${f.kind === "zone" ? " zone" : ""}`} style={f.kind === "zone" ? undefined : { fill: `url(#${hatch})` }} x={f.x} y={f.y} width={f.w} height={f.d} {...sw(1)}>
          <title>{`现状：${f.name}（保留）`}</title>
        </rect>
      ))}
      {pieces.map((p) => {
        const mount = p.mount ?? "floor";
        const air = mount === "wall" || mount === "ceiling" || mount === "on";
        const cls = ["piece", p.fill ? "" : "plain", p.soft ? "soft" : "", air ? "air" : "", hot === p.id ? "on" : ""].filter(Boolean).join(" ");
        const style = p.fill && !air ? { fill: p.fill } : undefined;
        const title = `${p.name}${p.w && p.d ? `，${p.w} × ${p.d}` : ""}${p.h ? ` × ${p.h}` : ""}（mm）${mount === "ceiling" ? "，吊顶" : mount === "wall" ? "，挂墙" : ""}`;
        const events = onHot ? { onMouseEnter: enter(p.id), onMouseLeave: leave, "data-piece": p.id } : {};
        return mount === "ceiling" ? (
          <circle key={p.id} className={cls} style={style} cx={p.x + p.w / 2} cy={p.y + p.d / 2} r={Math.max(p.w, p.d) / 2} {...sw(1.5)} {...events}>
            <title>{title}</title>
          </circle>
        ) : (
          <rect key={p.id} className={cls} style={style} x={p.x} y={p.y} width={p.w} height={p.d} {...sw(1)} {...events}>
            <title>{title}</title>
          </rect>
        );
      })}
      {unit
        ? pieces
            .filter((p) => p.num)
            .map((p) => (
              <g key={`n-${p.id}`} className={`badge-g${hot === p.id ? " on" : ""}`} {...(onHot ? { onMouseEnter: enter(p.id), onMouseLeave: leave } : {})}>
                <circle cx={p.x + p.w / 2} cy={p.y + p.d / 2} r={fs * 0.95} {...sw(1)} />
                <text x={p.x + p.w / 2} y={p.y + p.d / 2} textAnchor="middle" dominantBaseline="central" fontSize={fs}>
                  {p.num}
                </text>
              </g>
            ))
        : null}
      {unit
        ? dims.map((g, i) => {
            const horiz = Math.abs(g.a[1] - g.b[1]) < 1;
            const mx = (g.a[0] + g.b[0]) / 2;
            const my = (g.a[1] + g.b[1]) / 2;
            const tick = fs * 0.5;
            return (
              <g key={`d-${i}`} className="dim-g">
                <line className="dim" x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]} {...sw(1)} />
                {[g.a, g.b].map(([x, y], k) =>
                  horiz ? <line key={k} className="dim" x1={x} y1={y - tick} x2={x} y2={y + tick} {...sw(1)} /> : <line key={k} className="dim" x1={x - tick} y1={y} x2={x + tick} y2={y} {...sw(1)} />,
                )}
                <text
                  className="dim-t"
                  x={mx}
                  y={my}
                  dx={horiz ? 0 : fs * 0.6}
                  dy={horiz ? -fs * 0.4 : 0}
                  textAnchor={horiz ? "middle" : "start"}
                  dominantBaseline={horiz ? "auto" : "central"}
                  fontSize={fs}
                  strokeWidth={fs * 0.3}
                >
                  {g.text}
                </text>
              </g>
            );
          })
        : null}
      {unit
        ? labels.map((l) => (
            <text key={l.text} className="label" x={l.x} y={l.y} textAnchor="middle" fontSize={fs} strokeWidth={fs * 0.3}>
              {l.text}
            </text>
          ))
        : null}
    </svg>
  );
}

export function bbox(polys: [number, number][][], pad: number): [number, number, number, number] {
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const p of polys)
    for (const [x, y] of p) {
      a = Math.min(a, x);
      b = Math.min(b, y);
      c = Math.max(c, x);
      d = Math.max(d, y);
    }
  return [a - pad, b - pad, c + pad, d + pad];
}
