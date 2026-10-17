/**
 * 风格方案在平面上的物件、编号和颜色。移植自 boards/src/main.js 的 piecesFor / numbering / fillOf。
 */
import { chroma, deltaE00, hexToLab } from "../../../boards/src/metrics.mjs";
import { RULES, boardRoomOf, cropOf, layoutPieces, type BScheme, type BoardRoomId, type BPiece, type Scene } from "../data";
import type { PlanPiece } from "./Plan";

type AnyPiece = BPiece & { type?: string; cover?: boolean };

export function piecesFor(s: BScheme, roomId: BoardRoomId, scene: Scene): AnyPiece[] {
  const br = boardRoomOf(roomId);
  if (br.plan === "L") {
    return [...(layoutPieces(s.layout, scene) as AnyPiece[]), ...(s.rooms.L.pieces ?? []), ...(s.rooms.E.pieces ?? [])];
  }
  return s.rooms[roomId]?.pieces ?? [];
}

/** 房间内按拼贴顺序给物件编号；小件、材质块不编号。 */
export function numbering(s: BScheme, roomId: BoardRoomId) {
  const map = new Map<string, number>();
  for (const t of s.rooms[roomId]?.tiles ?? []) if (t.piece && !map.has(t.piece)) map.set(t.piece, map.size + 1);
  return map;
}

/** 平面上物件的颜色：数据里指定的，或对应拼贴主色归到方案色板里最近的一个。 */
function fillOf(s: BScheme, p: AnyPiece, tileOf: Map<string, string>) {
  if (p.fill) return p.fill;
  const cropId = tileOf.get(p.id);
  if (!cropId) return null;
  const pal = [...s.palette.main, ...s.palette.accent].map((c) => ({ ...c, lab: hexToLab(c.hex) }));
  const top = cropOf(cropId).palette.find((c) => chroma(c.lab) > RULES.neutralChroma);
  if (!top) return null;
  let best: string | null = null;
  let bd = Infinity;
  for (const c of pal) {
    const d = deltaE00(top.lab, c.lab);
    if (d < bd) [bd, best] = [d, c.hex];
  }
  return best;
}

const ROOM_IDS: BoardRoomId[] = ["L", "E", "A", "B", "C", "K", "Bath"];

/** 某方案某房间（或全屋）要画的物件。全屋不编号、客厅取日常状态。 */
export function stylePieces(s: BScheme, roomId: BoardRoomId, scene: Scene): PlanPiece[] {
  const house = roomId === "house";
  const out: PlanPiece[] = [];
  const seen = new Set<string>();
  for (const rid of house ? ROOM_IDS : [roomId]) {
    if (house && rid === "E") continue;
    const nums = house ? new Map<string, number>() : numbering(s, rid);
    const tileOf = new Map<string, string>();
    for (const t of [...(s.rooms[rid]?.tiles ?? []), ...(rid === "L" ? s.rooms.E.tiles : [])]) if (t.piece && !tileOf.has(t.piece)) tileOf.set(t.piece, t.crop);
    for (const p of piecesFor(s, rid, house ? "daily" : scene)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({ id: p.id, name: p.name, x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, mount: p.mount, fill: fillOf(s, p, tileOf), soft: Boolean(p.cover || p.type === "rug"), num: nums.get(p.id) });
    }
  }
  return out;
}
