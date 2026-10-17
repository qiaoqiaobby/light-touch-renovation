// 拼贴板数据的组装：先跑方案检查，再把用到的裁切读成 data URI。
// 拼贴板页面（build.mjs）和交付页（scripts/build-present.mjs）共用这一份，页面各自传 meta。
// 前置：python3 boards/scripts/crop.py
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS, DOORS } from '../../src/floorplan/plan-data.ts';
import { SCHEMES as LAYOUTS, SCENES, resolvePieces } from '../../src/floorplan/living-schemes.ts';
import { SCHEMES, RULES } from '../data/schemes.mjs';
import { FIXED, RETAINED, BOARD_ROOMS } from '../data/house.mjs';
import { check } from './check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 检查失败时只返回 problems；通过时返回 data（键顺序固定，拼贴板产物逐字节可复现）和用到的裁切 id。 */
export function boardData(meta) {
  const { problems, facts } = check(SCHEMES);
  if (problems.length) return { problems };

  const cropMeta = JSON.parse(readFileSync(resolve(root, 'mid/jalo/crops/crops.json'), 'utf8'));
  const used = new Set([...SCHEMES.flatMap((s) => Object.values(s.rooms).flatMap((r) => r.tiles.map((t) => t.crop))), ...RETAINED.map((r) => r.swatch)]);
  const crops = {};
  for (const id of used) {
    const c = cropMeta[id];
    const b64 = readFileSync(resolve(root, 'mid/jalo/crops', `${id}.webp`)).toString('base64');
    crops[id] = { name: c.name, take: c.take ?? '', img: c.img ?? null, w: c.w, h: c.h, tags: c.tags ?? [], palette: c.palette, src: `data:image/webp;base64,${b64}` };
  }

  const layouts = {};
  for (const L of LAYOUTS) {
    layouts[L.id] = {};
    for (const sc of SCENES) layouts[L.id][sc.id] = resolvePieces(L, sc.id).map(({ states, only, ...p }) => p);
  }

  const data = {
    meta,
    rules: RULES,
    rooms: ROOMS.map(({ id, name, poly, glass }) => ({ id, name, poly, glass })),
    doors: DOORS,
    fixed: FIXED,
    boardRooms: BOARD_ROOMS,
    retained: RETAINED,
    scenes: SCENES,
    layouts,
    schemes: SCHEMES,
    crops,
    facts,
  };
  return { problems, data, used };
}
