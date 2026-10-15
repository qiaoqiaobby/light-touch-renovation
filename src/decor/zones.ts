import type { SchemeId, Stage } from "./types";

/**
 * 蓝色护墙板范围：viz/src/geometry.js 的 MEDIA_WALL（旧 y 2450–4540）
 * 按客厅进深比例 5738 / 6270 换算到 y = 6252 起算，整面墙高。待现场复核。
 * westWall 只在席地、L2 起覆盖客厅西墙。
 */
export const ZONES: {
  id: string;
  room: "L";
  edge: number;
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  schemes?: SchemeId[];
  from?: Stage;
}[] = [
  { id: "blue", room: "L", edge: 13, a0: 8494, a1: 10406, y0: 0, y1: 2700 },
  { id: "westWall", room: "L", edge: 13, a0: 7550, a1: 12113, y0: 0, y1: 2700, schemes: ["S3"], from: "L2" },
];
