import type { RoomId, ViewId } from "./types";

export type ViewSpec = {
  id: ViewId;
  /** 多边形所在的户型房间。玄关在客厅轮廓里。 */
  room: "L" | "A" | "B" | "C" | "K" | "Bath";
  panels: RoomId[];
  eye: [number, number];
  target: [number, number, number];
};

/** 视高 1580、竖向视角 62° 由视点机位使用，不写进每个视点。 */
export const VIEWS: ViewSpec[] = [
  { id: "L-entry", room: "L", panels: ["L", "E"], eye: [6400, 14150], target: [7300, 6600, 1100] },
  { id: "L-hall", room: "L", panels: ["L", "E"], eye: [4900, 6900], target: [8000, 11200, 900] },
  { id: "E", room: "L", panels: ["E"], eye: [7300, 12400], target: [5800, 14400, 1200] },
  { id: "A", room: "A", panels: ["A"], eye: [4800, 5750], target: [3200, 1300, 1000] },
  { id: "B", room: "B", panels: ["B"], eye: [3800, 6900], target: [1200, 4700, 1000] },
  { id: "C", room: "C", panels: ["C"], eye: [4865, 8050], target: [2750, 9200, 1100] },
  { id: "K", room: "K", panels: ["K"], eye: [8550, 12900], target: [9900, 10200, 1000] },
  { id: "Bath", room: "Bath", panels: ["Bath"], eye: [3680, 11740], target: [4520, 10840, 750] },
];
