/**
 * 盲选池。四套方案的拼贴数量不同（独有裁切 24 / 16 / 15 / 25），还有几张跨方案共用，
 * 直接混在一起洗牌会偏向拼贴多的方案，共用的裁切揭晓时也没法归属。所以：
 * 每套只取只属于本方案的物件类拼贴，按客厅、玄关、卧室、厨卫的顺序取前 PER_SCHEME 块，再用固定种子洗牌。
 */
import type { BScheme, SchemeId } from "./data";

export const PER_SCHEME = 8;
export const PICK_MIN = 3;
export const PICK_MAX = 5;
const ROOM_ORDER = ["L", "E", "A", "B", "C", "K", "Bath"];
const SEED = 20261017;

export type PoolTile = { crop: string; scheme: SchemeId };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickPool(schemes: BScheme[]): PoolTile[] {
  const owners = new Map<string, Set<SchemeId>>();
  for (const s of schemes)
    for (const room of Object.values(s.rooms))
      for (const t of room.tiles) {
        if (!owners.has(t.crop)) owners.set(t.crop, new Set());
        owners.get(t.crop)!.add(s.id);
      }
  const pool: PoolTile[] = [];
  for (const s of schemes) {
    const mine: string[] = [];
    for (const roomId of ROOM_ORDER)
      for (const t of s.rooms[roomId]?.tiles ?? []) {
        if (!t.piece || t.crop.startsWith("base-") || owners.get(t.crop)!.size > 1 || mine.includes(t.crop)) continue;
        mine.push(t.crop);
      }
    for (const crop of mine.slice(0, PER_SCHEME)) pool.push({ crop, scheme: s.id });
  }
  const rand = rng(SEED);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** 池子是否均衡：每套块数相同，且没有一张裁切同时属于两套。构建检查用。 */
export function poolProblems(pool: PoolTile[], schemes: BScheme[]) {
  const problems: string[] = [];
  for (const s of schemes) {
    const n = pool.filter((t) => t.scheme === s.id).length;
    if (n !== PER_SCHEME) problems.push(`${s.name} 在盲选池里有 ${n} 块，应为 ${PER_SCHEME}`);
  }
  const crops = pool.map((t) => t.crop);
  if (new Set(crops).size !== crops.length) problems.push("盲选池里有重复的裁切");
  for (const t of pool) {
    const users = schemes.filter((s) => Object.values(s.rooms).some((r) => r.tiles.some((x) => x.crop === t.crop)));
    if (users.length > 1) problems.push(`${t.crop} 同时属于 ${users.map((s) => s.name).join("、")}`);
  }
  return problems;
}
