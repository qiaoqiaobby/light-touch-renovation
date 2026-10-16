import { SCHEMES as LAYOUTS, resolvePieces, type Scene } from "../floorplan/living-schemes";
import { ROOMS } from "../floorplan/plan-data";
import { SCHEMES as BOARD_SCHEMES } from "../../boards/data/schemes.mjs";
import { FIXED as HOUSE_FIXED } from "../../boards/data/house.mjs";
import { COPY } from "./copy";
import { CEILING_POINTS, curtainSpecs, FIXED_EXTRA, type CurtainSpec } from "./extras";
import { facingKindOf, facingOf } from "./facing";
import { EXISTING } from "./retained";
import { levelFor } from "./levels";
import { ceilingVariant, headboardVariant, partMats, resolveLook, type ResolvedLook, type TileRef } from "./looks";
import { resolveRole, type RoleOverride } from "./roles";
import { STAGE_RANK, type DecorItem, type Facing, type Light, type LightSpec, type MatSpec, type Mount, type RoomId, type SchemeId, type Stage, type SurfaceSpec, type Tag } from "./types";
import { ZONES } from "./zones";
import { VIEWS, type ViewSpec } from "./views";

type BPiece = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  z?: number;
  mount?: Mount;
  tuck?: string;
  seat?: number;
};
type BTile = { crop: string; piece?: string; use?: string };
type BScheme = {
  id: SchemeId;
  name: string;
  exclude: Tag[];
  layout: "s1" | "s2" | "s3";
  palette: { main: { name: string; hex: string }[]; accent: { name: string; hex: string }[] };
  retained: Record<string, { keep: boolean; level?: Stage; text?: string }>;
  rooms: Record<string, { tiles: BTile[]; pieces: BPiece[]; changes: { level: string; text: string }[] }>;
};
type HFixed = { id: string; room: RoomId; kind: string; name: string; x: number; y: number; w: number; d: number; h: number; swatch?: string };

export const BOARDS = BOARD_SCHEMES as unknown as BScheme[];
const FIXED = HOUSE_FIXED as unknown as HFixed[];
const ROOM_ORDER = ["L", "E", "A", "B", "C", "K", "Bath"] as RoomId[];

export type BuildOpts = {
  shift: Partial<Record<SchemeId, Record<string, Partial<Pick<DecorItem, "x" | "y" | "w" | "d">>>>>;
  omit: { scheme: SchemeId; stage: Stage; key: string } | null;
  blankSoftSrc: boolean;
  floorSoft: boolean;
  role: RoleOverride;
  brassOnS1: boolean;
  extraLamps: number;
  headboardT: number;
  copyTitle: string;
  views: ViewSpec[];
};

export const DATA: BuildOpts = {
  shift: {},
  omit: null,
  blankSoftSrc: false,
  floorSoft: false,
  role: null,
  brassOnS1: false,
  extraLamps: 0,
  headboardT: 25,
  copyTitle: COPY.title,
  views: VIEWS.map((v) => ({ ...v, eye: [...v.eye] as [number, number], target: [...v.target] as [number, number, number] })),
};

const POLY = Object.fromEntries(ROOMS.map((r) => [r.id, r.poly])) as Record<string, [number, number][]>;

export function boardOf(id: SchemeId) {
  const found = BOARDS.find((s) => s.id === id);
  if (!found) throw new Error(`缺少方案 ${id}`);
  return found;
}

function polyOf(room: string) {
  return POLY[room === "E" ? "L" : room];
}

function tilesOf(scheme: BScheme) {
  const map = new Map<string, TileRef[]>();
  for (const room of ROOM_ORDER) {
    for (const tile of scheme.rooms[room]?.tiles ?? []) {
      if (!tile.piece) continue;
      const list = map.get(tile.piece) ?? [];
      list.push({ crop: tile.crop, piece: tile.piece });
      map.set(tile.piece, list);
    }
  }
  return map;
}

function repRole(id: SchemeId, finish: string): string | null {
  if (finish === "blue") return id === "S1" ? "softLight" : id === "S2" ? "lacquer" : id === "S3" ? "plaster" : null;
  if (finish === "redwood") return id === "S1" ? "wood" : null;
  if (finish === "kitblue") return id === "S1" ? "lacquer" : id === "S3" ? "wood" : null;
  if (finish === "wall") return id === "S3" ? "plaster" : null;
  return null;
}

function film(scheme: BScheme, finish: string, stage: Stage, opts: BuildOpts): MatSpec | null {
  const rule = scheme.retained[finish];
  const role = repRole(scheme.id, finish);
  if (!rule || rule.keep || !role) return null;
  if (STAGE_RANK[stage] < STAGE_RANK[rule.level ?? "L2"]) return null;
  return resolveRole(scheme.id, role, opts.role);
}

function defaultZ(mount: Mount, id: string, h: number, given?: number) {
  if (typeof given === "number") return given;
  if (id === "e-shelf") return 1150;
  if (id === "c-shelf") return 1100;
  if (id === "e-lamp" || id === "bath-sconce") return 1600;
  if (mount === "wall") return Math.max(300, 1500 - h / 2);
  if (mount === "ceiling") return Math.max(200, 2100 - h);
  return 0;
}

function lightOf(item: DecorItem): LightSpec | undefined {
  const kind =
    item.model === "lampFloor" ? "floor" :
    item.model === "lampTable" ? "table" :
    item.model === "pendant" ? "pendant" :
    item.model === "sconce" ? "sconce" :
    item.model === "ceilingLight" ? "ceiling" : null;
  if (!kind) return undefined;
  const intensity =
    item.model === "ceilingLight" ? (item.variant === "cool" ? 9 : 5) :
    item.variant === "paper" ? 2.5 :
    item.model === "lampFloor" ? 3.5 :
    item.model === "lampTable" ? 1.8 :
    item.model === "pendant" ? 3 : 1.5;
  const color = item.variant === "cool" ? "#eef4ff" : kind === "ceiling" ? "#ffcf94" : "#ffd2a0";
  const shadow = (item.model === "lampFloor" && item.room === "L") || (item.model === "lampTable" && item.room === "A");
  return { kind, color, intensity, shadow, at: [item.x + item.w / 2, item.y + item.d / 2, item.z + Math.round(item.h * 0.62)] };
}

type Draft = DecorItem & { tuck?: string; seat?: boolean };

function stamp(scheme: SchemeId, draft: Draft): Draft {
  const lvl = levelFor(scheme, draft.src.kind, draft.src.id);
  draft.level = lvl.level;
  if (lvl.replaces) draft.replaces = lvl.replaces;
  draft.light = lightOf(draft);
  return draft;
}

let curtainMemo: CurtainSpec[] | null = null;

function baseItems(scheme: BScheme, stage: Stage, scene: Scene, opts: BuildOpts, soft = true): Draft[] {
  const layout = LAYOUTS.find((s) => s.id === scheme.layout);
  if (!layout) throw new Error(`缺少客厅布局 ${scheme.layout}`);
  const s1 = LAYOUTS.find((s) => s.id === "s1");
  if (!s1) throw new Error("缺少 s1");
  const tiles = tilesOf(scheme);
  const lookCache = new Map<string, ResolvedLook>();
  const items: Draft[] = [];
  const meta = new Map<string, { tuck?: string; seat?: boolean }>();

  const lookFor = (id: string) => {
    if (id === "c2") {
      const c1 = lookCache.get("c1");
      if (c1) return { ...c1, lamp: null, duvet: null };
    }
    const mine = tiles.get(id) ?? [];
    const otherId = id === "a-ns1" ? "a-ns2" : id === "a-ns2" ? "a-ns1" : "";
    const look = resolveLook(scheme.id, id, mine, otherId ? tiles.get(otherId) ?? [] : []);
    if (look.model === "block" && id === "c-chair") {
      const c1 = lookCache.get("c1");
      if (c1) {
        const copy = { ...c1, lamp: null, duvet: null, tags: [...c1.tags] };
        lookCache.set(id, copy);
        return copy;
      }
    }
    lookCache.set(id, look);
    return look;
  };

  const pushPiece = (piece: BPiece & { mount?: Mount; type?: string }, room: RoomId, kind: "layout" | "board") => {
    const look = lookFor(piece.id);
    const mount = (piece.mount ?? "floor") as Mount;
    const h = piece.h ?? (piece.id === "screen" ? 800 : 450);
    const draft: Draft = stamp(scheme.id, {
      key: piece.id,
      room,
      src: { kind, id: piece.id },
      level: "L1",
      name: piece.name,
      model: look.model,
      variant: look.variant,
      x: piece.x,
      y: piece.y,
      w: piece.w,
      d: piece.d,
      h,
      z: defaultZ(mount, piece.id, h, piece.z),
      mount,
      facing: null,
      mats: partMats(scheme.id, look.model, look.variant, opts.role, look.duvet, EXISTING),
      tags: [...look.tags],
      tuck: piece.tuck,
      seat: Boolean(piece.seat),
    });
    if (piece.id === "side" || piece.id === "shoe") {
      const next = film(scheme, "redwood", stage, opts) ?? EXISTING.redwood;
      draft.mats = { body: next, door: next, frame: next };
    }
    if (look.model === "art") {
      const mains = scheme.palette.main;
      draft.mats = {
        frame: resolveRole(scheme.id, "wood", opts.role),
        a: { hex: mains[0].hex, rough: 0.85 },
        b: { hex: mains[Math.min(1, mains.length - 1)].hex, rough: 0.85 },
      };
    }
    items.push(draft);
    meta.set(piece.id, { tuck: piece.tuck, seat: Boolean(piece.seat) });
    if (look.lamp) {
      const lamp = look.lamp;
      const lw = 200;
      const lh = 480;
      items.push(stamp(scheme.id, {
        key: `soft-${piece.id}-lamp`,
        room,
        src: { kind: "soft", id: `soft-${piece.id}-lamp` },
        level: "L1",
        name: "床头台灯",
        model: lamp.model,
        variant: lamp.variant,
        x: piece.x + piece.w / 2 - lw / 2,
        y: piece.y + piece.d / 2 - lw / 2,
        w: lw,
        d: lw,
        h: lh,
        z: h,
        mount: "on",
        host: piece.id,
        facing: null,
        mats: partMats(scheme.id, lamp.model, lamp.variant, opts.role, null, EXISTING),
        tags: [...(lamp.tags ?? [])],
      }));
    }
  };

  const own = resolvePieces(layout, scene);
  const entry = resolvePieces(s1, "daily").filter((p) => p.id === "fridge" || p.id === "side" || p.id === "shoe");
  if (stage === "L0") {
    for (const piece of entry) pushPiece(piece, "E", "layout");
  } else {
    for (const piece of own) pushPiece(piece, piece.y > 11990 ? "E" : "L", "layout");
    for (const piece of entry) {
      if (!items.some((it) => it.key === piece.id)) pushPiece(piece, "E", "layout");
    }
    for (const room of ROOM_ORDER) {
      for (const piece of scheme.rooms[room]?.pieces ?? []) pushPiece(piece, room, "board");
    }
  }

  for (const fixed of FIXED) {
    const model =
      fixed.kind === "cabinet" && fixed.room === "K" ? "kitchenBase" :
      fixed.id === "bath-van" ? "vanity" :
      fixed.kind === "cabinet" ? "wardrobe" :
      fixed.kind === "sill" ? "sillBlock" :
      fixed.kind === "zone" ? "shower" :
      fixed.id === "bath-squat" ? "squat" : "block";
    const draft = stamp(scheme.id, {
      key: fixed.id,
      room: fixed.room,
      src: { kind: "fixed", id: fixed.id },
      level: "L0",
      name: fixed.name,
      model,
      x: fixed.x,
      y: fixed.y,
      w: fixed.w,
      d: fixed.d,
      h: fixed.h,
      z: 0,
      mount: "floor",
      facing: null,
      mats: partMats(scheme.id, model, undefined, opts.role, null, EXISTING),
      tags: [],
    });
    if (fixed.swatch === "base-kitblue" || model === "kitchenBase") {
      const body = film(scheme, "kitblue", stage, opts) ?? EXISTING.kitblue;
      draft.mats = { ...draft.mats, body, door: body, top: EXISTING.counterStone };
    }
    items.push(draft);
  }

  for (const extra of FIXED_EXTRA) {
    const body = extra.finish === "kitblue" ? film(scheme, "kitblue", stage, opts) ?? EXISTING.kitblue : EXISTING[extra.finish] ?? EXISTING.appliance;
    items.push(stamp(scheme.id, {
      key: extra.id,
      room: extra.room,
      src: { kind: "fixed", id: extra.id },
      level: "L0",
      name: extra.name,
      model: extra.model,
      x: extra.x,
      y: extra.y,
      w: extra.w,
      d: extra.d,
      h: extra.h,
      z: extra.z,
      mount: extra.mount,
      facing: null,
      mats: { body, top: extra.finish === "kitblue" ? EXISTING.counterStone : body },
      tags: [],
    }));
  }

  CEILING_POINTS.forEach((pt, i) => {
    const id = `ceil-${pt.room}-${i}`;
    const place = { x: pt.at[0] - 225, y: pt.at[1] - 225, w: 450, d: 450, h: 60, z: 2640 };
    items.push(stamp(scheme.id, {
      key: id,
      room: pt.room,
      src: { kind: "extra", id },
      level: "L0",
      name: "吸顶灯",
      model: "ceilingLight",
      variant: "cool",
      ...place,
      mount: "ceiling",
      facing: null,
      mats: partMats(scheme.id, "ceilingLight", "cool", opts.role, null, EXISTING),
      tags: [],
    }));
    const warm = ceilingVariant(scheme.id);
    items.push(stamp(scheme.id, {
      key: `${id}-w`,
      room: pt.room,
      src: { kind: "extra", id: `${id}-w` },
      level: "L2",
      name: "吸顶灯",
      model: "ceilingLight",
      variant: warm,
      ...place,
      mount: "ceiling",
      facing: null,
      mats: partMats(scheme.id, "ceilingLight", warm, opts.role, null, EXISTING),
      tags: [],
    }));
  });

  const boardH = opts.headboardT;
  const hb = headboardVariant(scheme.id);
  items.push(stamp(scheme.id, {
    key: "a-headboard",
    room: "A",
    src: { kind: "extra", id: "a-headboard" },
    level: "L2",
    name: "挂墙床头板",
    model: "headboard",
    variant: hb,
    x: 5365 - boardH,
    y: 1674,
    w: boardH,
    d: 1800,
    h: scheme.id === "S4" ? 1500 : 1100,
    z: 300,
    mount: "wall",
    facing: null,
    mats: partMats(scheme.id, "headboard", hb, opts.role, null, EXISTING),
    tags: scheme.id === "S3" ? ["藤编"] : [],
  }));

  if (scheme.id === "S1" || scheme.id === "S2" || scheme.id === "S4") {
    const van = FIXED.find((f) => f.id === "bath-van");
    const variant = scheme.id === "S4" ? "opal" : "moon";
    const crop = scheme.id === "S4" ? "lamp-opal-208" : "lamp-moon-207";
    const look = resolveLook(scheme.id, "bath-sconce", [{ crop, piece: "bath-sconce" }]);
    if (van) {
      items.push(stamp(scheme.id, {
        key: "bath-sconce",
        room: "Bath",
        src: { kind: "extra", id: "bath-sconce" },
        level: "L2",
        name: "镜前壁灯",
        model: "sconce",
        variant,
        x: van.x + van.w / 2 - 140,
        y: 11950,
        w: 280,
        d: 40,
        h: 280,
        z: 1800,
        mount: "wall",
        facing: "n",
        mats: partMats(scheme.id, look.model, variant, opts.role, null, EXISTING),
        tags: [...look.tags],
      }));
    }
  }

  return finish(scheme, stage, opts, items, meta, soft);
}

function finish(scheme: BScheme, stage: Stage, opts: BuildOpts, items: Draft[], meta: Map<string, { tuck?: string; seat?: boolean }>, decorate: boolean) {
  if (decorate) decorateSoft(scheme, items, opts);
  let kept = items.filter((it) => STAGE_RANK[it.level] <= STAGE_RANK[stage]);
  const gone = new Set(kept.flatMap((it) => it.replaces ?? []));
  kept = kept.filter((it) => !gone.has(it.key));
  if (opts.omit && opts.omit.scheme === scheme.id && opts.omit.stage === stage) {
    kept = kept.filter((it) => it.key !== opts.omit?.key);
  }
  const shift = opts.shift[scheme.id] ?? {};
  for (const it of kept) {
    const over = shift[it.key];
    if (over) Object.assign(it, over);
  }
  const others = kept.map((it) => ({
    id: it.key,
    rect: it,
    kind: it.model.startsWith("desk") || it.key.includes("desk") ? "desk" : it.model.startsWith("table") || it.key === "table" ? "table" : "other",
  }));
  for (const it of kept) {
    if (it.facing) continue;
    const kind = facingKindOf(it, scheme.id === "S2");
    const extra = meta.get(it.key);
    it.facing = facingOf(it, polyOf(it.room), others, kind, extra?.tuck ?? it.tuck, Boolean(extra?.seat ?? it.seat));
  }
  for (const it of kept) {
    // 收纳墙门朝西，与 living-schemes 的 access.side 一致。储物墙长边朝南，对着入户。
    if (it.key === "storage") it.facing = "w";
    if (it.key === "store") it.facing = "s";
  }
  if (opts.blankSoftSrc) {
    const soft = kept.find((it) => it.src.kind === "soft");
    if (soft) soft.src = { kind: "soft", id: "" };
  }
  return kept;
}

function decorateSoft(scheme: BScheme, items: Draft[], opts: BuildOpts) {
  if (!curtainMemo) {
    const floor = (["S1", "S2", "S3", "S4"] as SchemeId[]).flatMap((id) =>
      baseFloor(id).filter((it) => it.mount === "floor" && it.model !== "sillBlock" && it.model !== "shower"),
    );
    curtainMemo = curtainSpecs(floor);
  }
  for (const spec of curtainMemo) {
    items.push(stamp(scheme.id, {
      key: spec.id,
      room: spec.room,
      src: { kind: "soft", id: spec.id },
      level: "L1",
      name: spec.model === "blind" ? "卷帘" : "窗帘",
      model: spec.model,
      x: spec.x,
      y: spec.y,
      w: spec.w,
      d: spec.d,
      h: spec.h,
      z: spec.z,
      mount: "wall",
      facing: null,
      mats: partMats(scheme.id, spec.model, undefined, opts.role, null, EXISTING),
      tags: [],
    }));
  }
  addBooks(scheme.id, items, opts);
  for (const host of items.filter((it) => it.model === "bed" || it.model === "daybed" || it.model === "loungeRocker")) {
    const parts = host.model === "bed" ? ["duvet", "pillow-a", "pillow-b", "throw"] : host.model === "daybed" ? ["cushion-a", "cushion-b", "cushion-c"] : ["cushion"];
    for (const part of parts) {
      items.push(stamp(scheme.id, {
        key: `soft-${host.key}-${part}`,
        room: host.room,
        src: { kind: "soft", id: `soft-${host.key}-${part}` },
        level: "L1",
        name: part.startsWith("pillow") ? "枕头" : part === "throw" ? "床尾搭毯" : part.startsWith("cushion") ? "靠垫" : "被子",
        model: "hosted",
        x: host.x + 40,
        y: host.y + 40,
        w: Math.min(400, host.w - 80),
        d: Math.min(300, host.d - 80),
        h: 60,
        z: host.h,
        mount: "on",
        host: host.key,
        facing: null,
        mats: host.mats,
        tags: part === "duvet" ? host.tags.filter((tag) => tag === "纹样") : [],
      }));
    }
  }
  if (opts.floorSoft) {
    items.push(stamp(scheme.id, {
      key: "soft-floor",
      room: "L",
      src: { kind: "soft", id: "soft-floor" },
      level: "L1",
      name: "落地软装",
      model: "block",
      x: 6000,
      y: 9000,
      w: 300,
      d: 300,
      h: 200,
      z: 0,
      mount: "floor",
      facing: null,
      mats: { body: resolveRole(scheme.id, "soft", opts.role) },
      tags: [],
    }));
  }
  if (opts.brassOnS1 && scheme.id === "S1") {
    items.push(stamp(scheme.id, {
      key: "extra-brass",
      room: "L",
      src: { kind: "extra", id: "extra-brass" },
      level: "L1",
      name: "壁灯",
      model: "sconce",
      variant: "brass",
      x: 8800,
      y: 9000,
      w: 40,
      d: 200,
      h: 300,
      z: 1600,
      mount: "wall",
      facing: "w",
      mats: partMats("S1", "sconce", "brass", opts.role, null, EXISTING),
      tags: ["黄铜"],
    }));
  }
  if (opts.extraLamps && scheme.id === "S4") {
    for (let i = 0; i < opts.extraLamps; i++) {
      items.push(stamp(scheme.id, {
        key: `soft-extra-lamp-${i}`,
        room: "A",
        src: { kind: "soft", id: `soft-extra-lamp-${i}` },
        level: "L1",
        name: "台灯",
        model: "lampTable",
        variant: "wood",
        x: 3600 + i * 30,
        y: 1800,
        w: 20,
        d: 20,
        h: 400,
        z: 500,
        mount: "on",
        host: "a-bed",
        facing: null,
        mats: partMats("S4", "lampTable", "wood", opts.role, null, EXISTING),
        tags: [],
      }));
    }
  }
}

const floorMemo = new Map<SchemeId, Draft[]>();

function baseFloor(id: SchemeId): Draft[] {
  const cached = floorMemo.get(id);
  if (cached) return cached;
  const built = baseItems(boardOf(id), "L3", "daily", DATA, false);
  floorMemo.set(id, built);
  return built;
}

function addBooks(scheme: SchemeId, items: Draft[], opts: BuildOpts) {
  if (scheme !== "S1" && scheme !== "S2") return;
  const shelf = items.find((it) => it.key === "shelf");
  if (!shelf) return;
  const grid = shelf.variant === "grid";
  const layers = grid ? Math.max(1, Math.round(shelf.h / 360)) : 3;
  const alongX = shelf.w >= shelf.d;
  const span = alongX ? shelf.w : shelf.d;
  const cols = Math.max(1, Math.round(span / (grid ? 360 : 400)));
  let seed = scheme === "S1" ? 11 : 29;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const colors = ["#c9c4b8", "#9e978a", "#6f6a62"];
  let n = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (let col = 0; col < cols; col++) {
      const count = 6 + Math.floor(rand() * 5);
      for (let b = 0; b < count; b++) {
        const bw = 24;
        const t = (col + (b + 0.5) / count) / cols;
        const x = alongX ? shelf.x + 20 + t * (shelf.w - 40) - bw / 2 : shelf.x + 30;
        const y = alongX ? shelf.y + 30 : shelf.y + 20 + t * (shelf.d - 40) - bw / 2;
        const hex = colors[Math.floor(rand() * colors.length)];
        items.push(stamp(scheme, {
          key: `book-${shelf.key}-${n}`,
          room: shelf.room,
          src: { kind: "soft", id: `book-${shelf.key}-${n}` },
          level: "L1",
          name: "书",
          model: "book",
          x, y, w: alongX ? bw : shelf.w - 60, d: alongX ? shelf.d - 60 : bw,
          h: 220,
          z: 30 + layer * (shelf.h / layers),
          mount: "on",
          host: shelf.key,
          facing: null,
          mats: { body: { hex, rough: 0.8 } },
          tags: [],
        }));
        n++;
      }
    }
  }
  void opts;
}

function surfacesOf(scheme: BScheme, stage: Stage, opts: BuildOpts): SurfaceSpec[] {
  const out: SurfaceSpec[] = [];
  const floorMat = (room: RoomId): MatSpec => {
    if (room === "K" || room === "Bath") return EXISTING.wetTile;
    if (room === "A" || room === "B" || room === "C") return EXISTING.bedfloor;
    return EXISTING.tile;
  };
  for (const room of ROOM_ORDER) {
    out.push({ id: `floor-${room}`, room, a0: 0, a1: 1, y0: 0, y1: 0, mat: floorMat(room), changed: false });
    const wet = room === "K" || room === "Bath";
    out.push({ id: `wall-${room}`, room, a0: 0, a1: 1, y0: 0, y1: 2700, mat: wet ? EXISTING.wallCeramic : EXISTING.wall, changed: false });
    out.push({ id: `ceil-${room}`, room, a0: 0, a1: 1, y0: 2700, y1: 2700, mat: EXISTING.ceiling, changed: false });
  }
  for (const zone of ZONES) {
    if (zone.schemes && !zone.schemes.includes(scheme.id)) continue;
    const painted = film(scheme, zone.id === "westWall" ? "wall" : zone.id, stage, opts);
    const active = !zone.from || STAGE_RANK[stage] >= STAGE_RANK[zone.from];
    const mat = active && painted ? painted : zone.id === "blue" ? EXISTING.blue : EXISTING.wall;
    out.push({ id: zone.id, room: zone.room, edge: zone.edge, a0: zone.a0, a1: zone.a1, y0: zone.y0, y1: zone.y1, mat, changed: Boolean(active && painted) });
  }
  return out;
}

/** 给窗帘判断用的 L3 落地件。不走软装，避免和窗帘互相引用。 */
function primeCurtains() {
  if (curtainMemo) return;
  for (const id of ["S1", "S2", "S3", "S4"] as SchemeId[]) baseFloor(id);
}

export function buildScene(id: SchemeId, stage: Stage, scene: Scene, light: Light, opts: BuildOpts = DATA) {
  primeCurtains();
  const scheme = boardOf(id);
  const items = baseItems(scheme, stage, scene, opts).map(({ tuck: _tuck, seat: _seat, ...item }) => item);
  const lights = light === "night" ? items.flatMap((it) => (it.light ? [it.light] : [])) : [];
  return { items, lights, surfaces: surfacesOf(scheme, stage, opts) };
}

export function srcOk(id: SchemeId, item: DecorItem) {
  if (!item.src.id) return false;
  if (item.src.kind === "layout") return LAYOUTS.some((layout) => layout.items.some((piece) => piece.id === item.src.id));
  if (item.src.kind === "board") return (boardOf(id).rooms && ROOM_ORDER.some((room) => boardOf(id).rooms[room]?.pieces.some((piece) => piece.id === item.src.id)));
  if (item.src.kind === "fixed") return FIXED.some((piece) => piece.id === item.src.id) || FIXED_EXTRA.some((piece) => piece.id === item.src.id);
  if (item.src.kind === "extra") return /^(ceil-|bath-sconce$|a-headboard$|extra-brass$)/.test(item.src.id);
  if (item.src.kind === "soft") return /^(soft-|curtain-|blind-|book-)/.test(item.src.id);
  return false;
}
