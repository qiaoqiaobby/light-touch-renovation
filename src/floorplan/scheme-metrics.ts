/**
 * 客厅三方案的关键测量值，只读 living-schemes.ts，没有副作用。
 * 审查（scheme-audit.ts）和交付页都从这里取数，允许区间仍写在 scheme-audit.ts。
 */
import { HALL, SCHEMES, resolvePieces, type Scene, type SchemeId } from "./living-schemes";

/** 方案一：观影时沙发坐面前沿到幕布的距离。 */
export function viewDistance() {
  const movie = resolvePieces(SCHEMES[0], "movie");
  const sofa = movie.find((p) => p.id === "sofa")!;
  const scr = movie.find((p) => p.id === "screen")!;
  return sofa.x - (scr.x + scr.w);
}

/** 方案二：日常时沙发西侧到西墙的通道宽。 */
export function westAisle() {
  const daily = resolvePieces(SCHEMES[1], "daily");
  const sofa = daily.find((p) => p.id === "sofa")!;
  return sofa.x - HALL.west;
}

/** 方案二：观影时沙发到吊装幕布的距离。 */
export function screenGap() {
  const movie = resolvePieces(SCHEMES[1], "movie");
  const sofa = movie.find((p) => p.id === "sofa")!;
  const scr = movie.find((p) => p.id === "screen")!;
  return scr.y - (sofa.y + sofa.d);
}

/** 方案三：观影时矮榻前沿到投影墙的距离。 */
export function throwDistance() {
  const s3 = resolvePieces(SCHEMES[2], "movie");
  const daybed = s3.find((p) => p.id === "daybed")!;
  const wall = s3.find((p) => p.id === "screen")!;
  return daybed.x - (wall.x + wall.w);
}

export type Span = {
  id: "view" | "aisle" | "gap" | "throw";
  scheme: SchemeId;
  scene: Scene;
  label: string;
  /** 平面上的线段端点，毫米，与 plan-data 同一坐标系 */
  a: [number, number];
  b: [number, number];
  value: number;
};

/** 四个关键距离的尺寸线。数值与上面的测量函数一致，端点取被测物件的中线。 */
export function spans(): Span[] {
  const s1 = resolvePieces(SCHEMES[0], "movie");
  const sofa1 = s1.find((p) => p.id === "sofa")!;
  const scr1 = s1.find((p) => p.id === "screen")!;
  const y1 = sofa1.y + sofa1.d / 2;
  const daily2 = resolvePieces(SCHEMES[1], "daily");
  const sofa2 = daily2.find((p) => p.id === "sofa")!;
  const y2 = sofa2.y + sofa2.d / 2;
  const movie2 = resolvePieces(SCHEMES[1], "movie");
  const sofa2m = movie2.find((p) => p.id === "sofa")!;
  const scr2 = movie2.find((p) => p.id === "screen")!;
  const x2 = sofa2m.x + sofa2m.w / 2;
  const s3 = resolvePieces(SCHEMES[2], "movie");
  const daybed = s3.find((p) => p.id === "daybed")!;
  const wall = s3.find((p) => p.id === "screen")!;
  const y3 = daybed.y + daybed.d / 2;
  return [
    { id: "view", scheme: "s1", scene: "movie", label: "观看距离", a: [scr1.x + scr1.w, y1], b: [sofa1.x, y1], value: viewDistance() },
    { id: "aisle", scheme: "s2", scene: "daily", label: "西侧通道", a: [HALL.west, y2], b: [sofa2.x, y2], value: westAisle() },
    { id: "gap", scheme: "s2", scene: "movie", label: "沙发到幕布", a: [x2, sofa2m.y + sofa2m.d], b: [x2, scr2.y], value: screenGap() },
    { id: "throw", scheme: "s3", scene: "movie", label: "投影距离", a: [wall.x + wall.w, y3], b: [daybed.x, y3], value: throwDistance() },
  ];
}

/** 某方案某场景下的座位数。 */
export function seats(index: number, scene: Scene) {
  return resolvePieces(SCHEMES[index], scene).reduce((sum, p) => sum + (p.seat ?? 0), 0);
}
