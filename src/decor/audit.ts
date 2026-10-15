import { mkdirSync, writeFileSync } from "node:fs";
import { SCHEMES as LAYOUTS, resolvePieces } from "../floorplan/living-schemes";
import { ROOMS } from "../floorplan/plan-data";
import { pointInPoly } from "../floorplan/geometry";
import { RULES } from "../../boards/data/schemes.mjs";
import { chroma, deltaE00, hexToLab } from "../../boards/src/metrics.mjs";
import { BANNED } from "../../boards/scripts/check.mjs";
import { COPY } from "./copy";
import { distPointRect } from "./geom";
import { headSide } from "./facing";
import { levelFor } from "./levels";
import { RETAINED_HEX } from "./retained";
import { boardOf, buildScene, DATA, srcOk, type BuildOpts } from "./scene-data";
import { STAGE_RANK, type DecorItem, type MatSpec, type SchemeId, type Stage, type SurfaceSpec } from "./types";

const STAGES: Stage[] = ["L0", "L1", "L2", "L3"];
const IDS = ["S1", "S2", "S3", "S4"] as SchemeId[];
const POLY = Object.fromEntries(ROOMS.map((r) => [r.id, r.poly])) as Record<string, [number, number][]>;

type Lab = ReturnType<typeof hexToLab>;

function paletteOf(id: SchemeId) {
  const scheme = boardOf(id);
  return [...scheme.palette.main, ...scheme.palette.accent].map((c) => ({ name: c.name, hex: c.hex, lab: hexToLab(c.hex) as Lab }));
}

function allowed(id: SchemeId) {
  return [
    ...paletteOf(id),
    ...Object.entries(RETAINED_HEX).map(([name, hex]) => ({ name, hex, lab: hexToLab(hex) as Lab })),
  ];
}

function nearest(lab: Lab, colors: { name: string; lab: Lab }[]) {
  let name = "";
  let d = Infinity;
  for (const c of colors) {
    const next = deltaE00(lab, c.lab);
    if (next < d) {
      d = next;
      name = c.name;
    }
  }
  return { name, d };
}

function checkMat(id: SchemeId, key: string, spec: MatSpec, colors: ReturnType<typeof allowed>, problems: string[]) {
  if (spec.neutralExempt) return;
  const lab = hexToLab(spec.hex) as Lab;
  if (chroma(lab) <= RULES.neutralChroma) return;
  const near = nearest(lab, colors);
  if (near.d > RULES.deltaE) problems.push(`色彩：${id} ${key} ${spec.hex} 最近 ${near.name} ΔE ${near.d.toFixed(1)}`);
}

function surfSig(list: SurfaceSpec[]) {
  return list.map((s) => `${s.id}:${s.mat.hex}`).sort().join("|");
}

function strings(value: unknown, out: string[] = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

export function audit(data: BuildOpts = DATA) {
  const problems: string[] = [];
  const warnings: string[] = [];
  const facts: Record<string, unknown> = { lights: {}, curtains: {}, heads: {}, models: {} };
  for (const id of IDS) {
    const scheme = boardOf(id);
    const colors = allowed(id);
    const palette = paletteOf(id);
    for (const finish of Object.keys(RETAINED_HEX)) {
      const lab = hexToLab(RETAINED_HEX[finish as keyof typeof RETAINED_HEX]) as Lab;
      const near = nearest(lab, palette);
      if (near.d > 15) warnings.push(`保留色复核：${id} ${finish} 校正后 ΔE ${near.d.toFixed(1)}`);
    }
    const built = Object.fromEntries(STAGES.map((stage) => [stage, {
      day: buildScene(id, stage, "daily", "day", data),
      night: buildScene(id, stage, "daily", "night", data),
    }])) as Record<Stage, { day: ReturnType<typeof buildScene>; night: ReturnType<typeof buildScene> }>;
    const l3 = built.L3.day.items;
    const replaced = new Set(l3.flatMap((it) => it.replaces ?? []));
    const layout = LAYOUTS.find((item) => item.id === scheme.layout);
    if (!layout) throw new Error(scheme.layout);
    for (const piece of resolvePieces(layout, "daily")) {
      if (replaced.has(piece.id)) continue;
      const hits = l3.filter((it) => it.src.kind === "layout" && it.src.id === piece.id);
      if (hits.length !== 1) problems.push(hits.length === 0 ? `对位：${id} 缺少 ${piece.id}` : `对位：${id} ${piece.id} 出现 ${hits.length} 次`);
      else if (hits[0].x !== piece.x || hits[0].y !== piece.y || hits[0].w !== piece.w || hits[0].d !== piece.d) {
        problems.push(`对位：${id} ${piece.id} 位置或尺寸与平面不一致`);
      }
    }
    for (const room of Object.values(scheme.rooms)) {
      for (const piece of room.pieces) {
        if (replaced.has(piece.id)) continue;
        const hits = l3.filter((it) => it.src.kind === "board" && it.src.id === piece.id);
        if (hits.length !== 1) problems.push(hits.length === 0 ? `对位：${id} 缺少 ${piece.id}` : `对位：${id} ${piece.id} 出现 ${hits.length} 次`);
        else if (hits[0].x !== piece.x || hits[0].y !== piece.y || hits[0].w !== piece.w || hits[0].d !== piece.d) {
          problems.push(`对位：${id} ${piece.id} 位置或尺寸与平面不一致`);
        }
      }
    }
    const l0mats = new Map(built.L0.day.items.map((it) => [it.key, JSON.stringify(it.mats)]));
    for (const it of l3) {
      if (!srcOk(id, it)) problems.push(`来源：${it.key} 无出处`);
      const expect = levelFor(id, it.src.kind, it.src.id || it.key);
      if (it.level !== expect.level) problems.push(`来源：${it.key} 层级应为 ${expect.level}`);
      if ((it.src.kind === "extra" || it.src.kind === "soft") && it.mount === "floor") problems.push(`落地：${it.key} 是新增落地物件`);
      for (const tag of it.tags) if (scheme.exclude.includes(tag)) problems.push(`排除：${id} ${it.key} 用了${tag}`);
      const changed = l0mats.get(it.key) !== JSON.stringify(it.mats);
      if (STAGE_RANK[it.level] >= 1 || changed) for (const spec of Object.values(it.mats)) checkMat(id, it.key, spec, colors, problems);
    }
    for (const surf of built.L3.day.surfaces) if (surf.changed) checkMat(id, surf.id, surf.mat, colors, problems);
    if (surfSig(built.L0.day.surfaces) !== surfSig(built.L1.day.surfaces)) problems.push(`阶段：${id} 表面在 L1 改变`);
    if (surfSig(built.L2.day.surfaces) !== surfSig(built.L3.day.surfaces)) problems.push(`阶段：${id} 表面在 L3 改变`);
    for (let i = 0; i < STAGES.length - 1; i++) {
      const now = built[STAGES[i]].day.items;
      const next = built[STAGES[i + 1]].day.items;
      const nextKeys = new Set(next.map((it) => it.key));
      const nextReplaces = new Set(next.flatMap((it) => it.replaces ?? []));
      for (const it of now) {
        if (!nextKeys.has(it.key) && !nextReplaces.has(it.key)) problems.push(`阶段：${id} ${it.key} 在 ${STAGES[i + 1]} 消失`);
      }
    }
    for (const stage of STAGES) {
      const night = built[stage].night;
      const day = built[stage].day;
      if (night.lights.length > 16) problems.push(`灯：${id} ${stage} 夜晚 ${night.lights.length} 盏，超过 16`);
      if (day.lights.length) problems.push(`灯：${id} ${stage} 白天不得有点光源`);
      const cool = stage === "L0" || stage === "L1";
      for (const it of night.items) {
        if (it.model !== "ceilingLight") continue;
        const expect = cool ? "#eef4ff" : "#ffcf94";
        if (it.light?.color !== expect) problems.push(`灯：${id} ${stage} 吸顶灯色不对`);
      }
    }
    const floor = l3.filter((it) => it.mount === "floor");
    for (const view of data.views) {
      const poly = POLY[view.room];
      if (!pointInPoly(view.eye[0], view.eye[1], poly)) problems.push(`视点：${view.id} 不在 ${view.room} 内`);
      for (const it of floor) {
        if (distPointRect(view.eye[0], view.eye[1], it) < 150) problems.push(`视点：${view.id} ${id} 离 ${it.name} 不足 150`);
      }
    }
    const bed = l3.find((it) => it.key === "a-bed");
    const board = l3.find((it) => it.key === "a-headboard");
    const thick = board?.w ?? 0;
    if (!bed || 1950 + 25 + thick > bed.w) problems.push("床垫：卧室 A 床垫与床头板超出床位");
    const bedB = l3.find((it) => it.key === "b-bed");
    const heads = {
      A: bed ? headSide(bed, POLY.A) : null,
      B: bedB ? headSide(bedB, POLY.B) : null,
    };
    if (heads.A !== "e") problems.push("朝向：卧室 A 床头应朝东");
    if (heads.B !== "w") problems.push("朝向：卧室 B 床头应朝西");
    (facts.heads as Record<string, unknown>)[id] = heads;
    (facts.lights as Record<string, number>)[id] = Math.max(...STAGES.map((stage) => built[stage].night.lights.length));
    (facts.curtains as Record<string, string[]>)[id] = l3.filter((it) => it.model === "curtain" || it.model === "blind").map((it) => `${it.key}:${it.model}`);
    (facts.models as Record<string, string>)[id] = l3.filter((it) => it.model === "block" && it.src.kind !== "fixed").map((it) => it.key).join(",");
  }
  const scanned = [data.copyTitle, ...strings(COPY), ...IDS.flatMap((id) => buildScene(id, "L3", "daily", "day", data).items.flatMap((it: DecorItem) => strings(it)))];
  for (const text of scanned) for (const word of BANNED as string[]) if (text.includes(word)) problems.push(`禁词：${word}`);
  facts.warnings = warnings;
  return { problems: [...new Set(problems)], warnings: [...new Set(warnings)], facts };
}

const MUTATIONS: [string, (data: BuildOpts) => void, RegExp][] = [
  ["S1 床移位", (data) => {
    const bed = boardOf("S1").rooms.A.pieces.find((piece) => piece.id === "a-bed");
    data.shift = { S1: { "a-bed": { x: (bed?.x ?? 0) + 100 } } };
  }, /对位：S1 a-bed/],
  ["软装失去出处", (data) => { data.blankSoftSrc = true; }, /来源：/],
  ["新增落地软装", (data) => { data.floorSoft = true; }, /落地：/],
  ["素木软装改成紫色", (data) => { data.role = { scheme: "S1", role: "soft", hex: "#7a3fa0" }; }, /色彩：S1/],
  ["素木加黄铜壁灯", (data) => { data.brassOnS1 = true; }, /排除：S1/],
  ["暖古典加六盏台灯", (data) => { data.extraLamps = 6; }, /灯：S4/],
  ["木与钢在 L2 去掉沙发", (data) => { data.omit = { scheme: "S2", stage: "L2", key: "sofa" }; }, /阶段：S2 sofa/],
  ["标题写入品牌", (data) => { data.copyTitle = `${COPY.title}索耐特`; }, /禁词：索耐特/],
  ["卧室 A 视点移到床上", (data) => {
    const view = data.views.find((item) => item.id === "A");
    if (view) view.eye = [4000, 2500];
  }, /视点：A/],
  ["床头板加厚", (data) => { data.headboardT = 60; }, /床垫：/],
];

const isMain = process.argv[1] && (process.argv[1].endsWith("audit.ts") || process.argv[1].endsWith("decor-audit.mjs"));
if (isMain) {
  const { problems, warnings, facts } = audit(DATA);
  mkdirSync("mid", { recursive: true });
  writeFileSync("mid/decor-facts.json", JSON.stringify({ warnings, facts, problems }, null, 1));
  if (problems.length) {
    console.log(`失败 ${problems.length} 项：\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
  } else console.log("失败 0 项");
  if (warnings.length) console.log(`提醒 ${warnings.length} 项：\n  ${warnings.join("\n  ")}`);
  if (process.argv.includes("--mutate")) {
    let caught = 0;
    for (const [name, mutate, expect] of MUTATIONS) {
      const copy = structuredClone(DATA);
      mutate(copy);
      const extra = audit(copy).problems.filter((item) => !problems.includes(item));
      const ok = extra.some((item) => expect.test(item));
      if (ok) caught++;
      else console.log(`漏掉：${name}（新增问题：${extra.slice(0, 8).join("；") || "无"}）`);
    }
    console.log(`变异 ${MUTATIONS.length} 项，捕获 ${caught} 项`);
    if (caught !== MUTATIONS.length) process.exitCode = 1;
  }
}

