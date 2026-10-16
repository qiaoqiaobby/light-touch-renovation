// 漫游页数据快照：几何与素木 L2 的布置，写给 light-touch-walk 的 src/walk/data/house.json
// 由 scripts/export-walk.mjs 打包后运行，不直接执行
import { writeFileSync } from "node:fs";
import { CEILING, DOORS, EYE, ROOMS, SECTION } from "../src/floorplan/plan-data";
import { BBOX, OX, OY, walls } from "../src/floorplan/geometry";
import { HALL } from "../src/floorplan/living-schemes";
import { buildScene, boardOf } from "../src/decor/scene-data";

const [out, commit, dirty] = process.argv.slice(2);
if (!out || !commit) throw new Error("用法：export-walk.mjs 内部调用，缺少输出路径或 commit");

const scheme = "S1" as const;
const stage = "L2" as const;
const { items, surfaces } = buildScene(scheme, stage, "daily", "day");
const board = boardOf(scheme);

const data = {
  meta: {
    source: "light-touch-renovation",
    commit,
    dirty: dirty === "1",
    exportedAt: new Date().toISOString(),
    units: "mm，+x 向东，+y 向南；三维以平面包围盒中心为原点，1 单位 = 1 m",
    origin: [OX, OY],
    bbox: BBOX,
    ceiling: { m: CEILING, status: "假定" },
    section: SECTION,
    eye: EYE,
    north: { dir: "-y", status: "户型图标注上北，未现场核实" },
    scheme: { id: scheme, name: board.name, layout: board.layoutName, stage, status: "风格占位，业主未选定" },
  },
  hall: HALL,
  rooms: ROOMS.map(({ id, name, zone, label, poly, glass, main }) => ({ id, name, zone, label, poly, glass, main })),
  walls: walls(),
  doors: DOORS.map(({ id, name, kind, axis, j, w, into, width, head }) => ({ id, name, kind, axis, j, w, into: into ?? null, width, head })),
  items: items.map(({ key, room, level, name, model, variant, x, y, w, d, h, z, mount, facing, mats }) => ({
    key, room, level, name, model, variant: variant ?? null, x, y, w, d, h, z, mount, facing, mats,
  })),
  surfaces,
};

writeFileSync(out, JSON.stringify(data, null, 1) + "\n");
console.log(`${out}：房间 ${data.rooms.length}，墙段 ${data.walls.length}，门 ${data.doors.length}，物件 ${data.items.length}，表面 ${data.surfaces.length}`);
