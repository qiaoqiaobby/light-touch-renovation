/** WebGL 不可用时的平面兜底：用同一份数据画，不另造内容。 */
import { BOARD_ROOMS, ROOMS, layoutPieces, schemeOf, type LayoutId, type Scene, type SchemeId } from "../data";
import { Plan, bbox } from "../board/Plan";
import { stylePieces } from "../board/style";

const houseView = bbox(
  ROOMS.map((r) => r.poly),
  300,
);
const houseLabels = BOARD_ROOMS.filter((r) => r.plan && r.id !== "E").map((br) => {
  const r = ROOMS.find((x) => x.id === br.plan)!;
  const [x0, y0, x1, y1] = bbox([r.poly], 0);
  return { x: (x0 + x1) / 2, y: br.plan === "L" ? y0 + 900 : (y0 + y1) / 2, text: br.name };
});

export function HousePlan() {
  return <Plan rooms={ROOMS} view={houseView} pieces={[]} labels={houseLabels} label="全屋现状平面" />;
}

export function LayoutFallback({ scheme, scene }: { scheme: LayoutId; scene: Scene }) {
  const L = ROOMS.find((r) => r.id === "L")!;
  const view = BOARD_ROOMS.find((r) => r.id === "L")!.view!;
  const pieces = layoutPieces(scheme, scene).map((p) => ({ id: p.id, name: p.name, x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, mount: p.mount, soft: Boolean(p.cover || p.type === "rug") }));
  return <Plan rooms={[L]} view={view} pieces={pieces} label="客厅布局平面" />;
}

export function StyleFallback({ scheme }: { scheme: SchemeId }) {
  return <Plan rooms={ROOMS} view={houseView} pieces={stylePieces(schemeOf(scheme), "house", "daily")} labels={houseLabels} label="全屋方案平面" />;
}
