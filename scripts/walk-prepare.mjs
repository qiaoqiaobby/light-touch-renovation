// 漫游页的输入准备：生成 walk/js/survey.js，并把 three.js 复制到 walk/vendor/three/。
// 房间轮廓、门、尺寸线和档案文字取自净尺寸核算页；墙体、窗台假定和示意家具取自户型三维。
// 两边的房间轮廓与门坐标必须逐点一致，否则不生成。
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "docs/plan/户型净尺寸核算-202610121252.html";
const fail = (msg) => {
  console.error(`walk:prepare 失败：${msg}`);
  process.exit(1);
};

/* ---------- 核算页里的数据 ---------- */

const html = readFileSync(join(root, SOURCE), "utf8");
const open = html.search(/\(function\(\)\{\s*const S=/);
const close = html.indexOf("const NS='http://www.w3.org/2000/svg'");
if (open < 0 || close < 0) fail(`${SOURCE} 的脚本结构变了，找不到 rooms / doors 数据段`);
const body = html.slice(html.indexOf("{", open) + 1, close);
const survey = vm.runInNewContext(`(() => { ${body}; return { rooms, exactEdges, doors, doorLines }; })()`);

/* ---------- 户型三维的墙体与示意家具 ---------- */

const bundle = join(root, "mid/walk-model.mjs");
mkdirSync(dirname(bundle), { recursive: true });
await esbuild.build({
  stdin: {
    contents: [
      'export { ROOMS, DOORS, FURNITURE, CEILING, EYE, BATH_STUB } from "./src/floorplan/plan-data";',
      'export { walls } from "./src/floorplan/geometry";',
    ].join("\n"),
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: bundle,
  logLevel: "silent",
});
const model = await import(`${pathToFileURL(bundle).href}?t=${Date.now()}`);

/* ---------- 对账 ---------- */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const r of survey.rooms) {
  const m = model.ROOMS.find((x) => x.id === r.id);
  if (!m) fail(`户型三维里没有房间 ${r.id}`);
  if (!same(m.poly, r.poly)) fail(`房间 ${r.id} 的轮廓与核算页不一致`);
}
if (model.ROOMS.length !== survey.rooms.length) fail("两边的房间数不同");
for (const d of survey.doors) {
  const m = model.DOORS.find((x) => x.id === d.id);
  if (!m) fail(`户型三维里没有门 ${d.id}`);
  for (const k of ["kind", "axis", "j", "w", "width"]) {
    if (!same(m[k], d[k])) fail(`门 ${d.id} 的 ${k} 与核算页不一致`);
  }
}

/* ---------- 输出 ---------- */

const r1 = (v) => Math.round(v * 10) / 10;
const data = {
  source: SOURCE,
  ceiling: model.CEILING,
  eye: model.EYE,
  rooms: survey.rooms.map((r) => {
    const m = model.ROOMS.find((x) => x.id === r.id);
    return {
      id: r.id,
      name: r.name,
      zone: r.type,
      label: r.label,
      area: r.area,
      raw: r.raw,
      poly: r.poly,
      glass: m.glass,
      lab: r.lab,
      small: !!r.small,
      main: r.main,
      kv: r.kv.map(([k, v, exact]) => ({ k, v, exact: !!exact })),
      tip: r.tip,
      dims: r.dims.map(([x1, y1, x2, y2, t, exact]) => ({ x1, y1, x2, y2, t, exact: !!exact })),
      doorLine: survey.doorLines[r.id] ?? "",
    };
  }),
  doors: survey.doors.map((d) => {
    const m = model.DOORS.find((x) => x.id === d.id);
    return {
      id: d.id,
      name: d.name,
      kind: d.kind,
      axis: d.axis,
      j: d.j,
      w: d.w,
      side: d.side,
      into: d.into ?? null,
      width: d.width,
      thick: d.thick,
      radius: d.r ?? null,
      piers: d.p,
      pierNames: d.pn,
      panels: d.panels ?? null,
      where: d.where,
      open: d.open,
      tip: d.tip,
      head: m.head,
    };
  }),
  walls: model.walls().map((w) => ({
    id: w.id,
    axis: w.axis,
    a0: r1(w.a0),
    a1: r1(w.a1),
    f0: r1(w.f0),
    f1: r1(w.f1),
    kind: w.kind,
    openings: w.openings.map((o) => ({
      a0: r1(o.a0),
      a1: r1(o.a1),
      kind: o.kind,
      sill: o.sill,
      head: o.head,
      door: o.doorId ?? null,
    })),
  })),
  furniture: model.FURNITURE,
  stub: model.BATH_STUB,
};

const out = join(root, "walk/js/survey.js");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  [
    "// 自动生成，不要手改。重新生成：npm run walk:prepare",
    `// 房间、门、尺寸线、档案文字：${SOURCE}`,
    "// 墙体、窗台与门头高度（假定）、示意家具：src/floorplan/plan-data.ts 与 geometry.ts",
    `export const SURVEY = ${JSON.stringify(data, null, 1)};`,
    "",
  ].join("\n"),
);

/* ---------- three.js ---------- */

const vendor = join(root, "walk/vendor/three");
mkdirSync(vendor, { recursive: true });
const three = join(root, "node_modules/three");
for (const f of ["build/three.module.js", "build/three.core.js", "LICENSE"]) {
  copyFileSync(join(three, f), join(vendor, f.split("/").pop()));
}
const addons = [
  "lines/LineSegments2.js",
  "lines/LineSegmentsGeometry.js",
  "lines/LineMaterial.js",
  "environments/RoomEnvironment.js",
];
for (const f of addons) {
  const src = readFileSync(join(three, "examples/jsm", f), "utf8").replace(/from 'three';/g, "from './three.module.js';");
  writeFileSync(join(vendor, f.split("/").pop()), src);
}
const version = JSON.parse(readFileSync(join(three, "package.json"), "utf8")).version;

console.log(
  `walk:prepare 通过：房间 ${data.rooms.length}，门 ${data.doors.length}，墙段 ${data.walls.length}，示意家具 ${data.furniture.length}，three ${version}`,
);
