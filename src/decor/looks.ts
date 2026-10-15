import type { MatSpec, SchemeId, Tag } from "./types";
import { resolveRole, type RoleOverride } from "./roles";

export type Look = { model: string; variant?: string; tags?: Tag[] };

type CropLook = Look & {
  whenStorage?: Look;
  whenDesk?: Look;
  whenPendant?: Look;
};

/** 拼贴块 → 模型。床品只改 duvet，不改床的模型。 */
export const CROP_MODEL: Record<string, CropLook> = {
  "cab-open-9": { model: "cabLow", variant: "open" },
  "cab-open-12": { model: "shelfOpen", variant: "low" },
  "cab-modular-15": { model: "shelfOpen", variant: "grid" },
  "cab-modular-31": { model: "shelfWall", variant: "grid" },
  "cab-48": { model: "shelfWall", variant: "cubby" },
  "cab-tambour-72": { model: "storageWall", variant: "tambour" },
  "cab-tambour-78": { model: "cabLow", variant: "tambour" },
  "cab-tambour-91": { model: "cabLow", variant: "tambour" },
  "cab-metal-105": { model: "cabLow", variant: "metal", tags: ["黑钢"] },
  "cab-metal-106": { model: "cabLow", variant: "metal", tags: ["黑钢"], whenStorage: { model: "storageWall", variant: "metal", tags: ["黑钢"] } },
  "cab-cane-24": { model: "cabLow", variant: "cane", tags: ["藤编"] },
  "cab-cane-26": { model: "cabLow", variant: "cane", tags: ["藤编"] },
  "cab-low-28": { model: "cabLow", variant: "round" },
  "chest-teak-99": { model: "cabLow", variant: "drawers" },
  "chest-shell-104": { model: "cabLow", variant: "shell" },
  "chest-smile-84": { model: "cabLow", variant: "smile" },
  "chest-smile-86": { model: "cabLow", variant: "smile" },
  "cab-cherry-88": { model: "tallCab", variant: "glazed" },
  "night-143": { model: "cabLow", variant: "night" },
  "desk-sec-96": { model: "deskRect", variant: "secretary" },
  "dresser-103": { model: "dresser" },
  "desk-123": { model: "deskRect", variant: "drawers" },
  "desk-fork-128": { model: "deskRect", variant: "fork" },
  "chd-189": { model: "tableRect", variant: "chunky", whenDesk: { model: "deskRect", variant: "chunky" } },
  "table-round-117": { model: "tableRect", variant: "taper" },
  "table-square-119": { model: "tableRect", variant: "taper" },
  "table-cross-121": { model: "tableRect", variant: "cross" },
  "side-round-134": { model: "sideTable", variant: "round" },
  "side-square-135": { model: "sideTable", variant: "square" },
  "chair-bent-146": { model: "chairBentwood", variant: "plain" },
  "chair-bent-148": { model: "chairBentwood", variant: "cane", tags: ["藤编"] },
  "chair-bent-152": { model: "chairBentwood", variant: "dark" },
  "chair-y-157": { model: "chairY" },
  "chd-187": { model: "chairCane", tags: ["藤编"] },
  "chair-rock-172": { model: "loungeRocker" },
  "chair-sheep-170": { model: "clubChair", tags: ["羊毛"] },
  "chd-186": { model: "daybed", tags: ["藤编"] },
  "sofa-176": { model: "sofa", variant: "linen" },
  "sofa-181": { model: "sofa", variant: "leather", tags: ["皮革"] },
  "sofa-183": { model: "sofa", variant: "low" },
  "bed-194": { model: "bed", variant: "teak" },
  "bed-195": { model: "bed", variant: "dark" },
  "bed-cherry-192": { model: "bed", variant: "cherry" },
  "lamp-wood-196": { model: "lampFloor", variant: "woodPole" },
  "lamp-bell-222": { model: "lampFloor", variant: "bell", tags: ["黄铜"] },
  "lamp-wood-211": { model: "lampTable", variant: "wood" },
  "lamp-desk-226": { model: "lampTable", variant: "waist" },
  "lamp-paper-213": { model: "lampTable", variant: "paper", whenPendant: { model: "pendant", variant: "paper" } },
  "lamp-crown-201": { model: "lampTable", variant: "pleated", tags: ["黄铜"] },
  "lamp-218": { model: "pendant", variant: "enamel" },
  "lamp-deco-209": { model: "pendant", variant: "opal", tags: ["黄铜"] },
  "lamp-brass-204": { model: "sconce", variant: "brass", tags: ["黄铜"] },
  "lamp-moon-207": { model: "sconce", variant: "moon" },
  "lamp-opal-208": { model: "sconce", variant: "opal", tags: ["黄铜"] },
  "rug-252": { model: "rug", variant: "persian", tags: ["纹样"] },
  "throw-242": { model: "rug", variant: "wool", tags: ["羊毛"] },
  "chd-188": { model: "rug", variant: "rush" },
  "mirror-145": { model: "mirror" },
  "vase-249": { model: "art" },
  "vase-245": { model: "art" },
};

const BEDDING: Record<string, { role: string; tag?: Tag; floral236?: boolean }> = {
  "bedding-linen-230": { role: "soft" },
  "bedding-white-231": { role: "softLight" },
  "quilt-236": { role: "floral", tag: "纹样", floral236: true },
  "quilt-232": { role: "floral", tag: "纹样" },
  "bedding-stripe-227": { role: "print", tag: "纹样" },
};

const LAMP_MODELS = new Set(["lampFloor", "lampTable", "pendant", "sconce"]);
const CABINET_MODELS = new Set(["cabLow", "shelfOpen", "shelfWall", "storageWall", "tallCab", "dresser"]);

const NIGHT: Record<SchemeId, Look> = {
  S1: { model: "cabLow", variant: "night" },
  S2: { model: "cabLow", variant: "metal", tags: ["黑钢"] },
  S3: { model: "cabLow", variant: "round" },
  S4: { model: "cabLow", variant: "smile" },
};

export type TileRef = { crop: string; piece?: string };

function cropLook(crop: string, pieceId: string): Look | null {
  const row = CROP_MODEL[crop];
  if (!row) return null;
  if (pieceId === "storage" && row.whenStorage) return row.whenStorage;
  if (pieceId === "b-desk" && row.whenDesk) return row.whenDesk;
  if (pieceId === "l-paper" && row.whenPendant) return row.whenPendant;
  return { model: row.model, variant: row.variant, tags: row.tags };
}

export type ResolvedLook = {
  model: string;
  variant?: string;
  tags: Tag[];
  duvet: { role: string; floral236?: boolean } | null;
  lamp: Look | null;
};

function cabinetOf(tiles: TileRef[], pieceId: string): Look | null {
  for (const t of tiles) {
    const look = cropLook(t.crop, pieceId);
    if (look && CABINET_MODELS.has(look.model)) return look;
  }
  return null;
}

/** 先拼贴，再床头柜上的台灯，最后按 id。 */
export function resolveLook(scheme: SchemeId, pieceId: string, tiles: TileRef[], otherNightTiles: TileRef[] = []): ResolvedLook {
  const tags: Tag[] = [];
  let look: Look | null = null;
  let duvet: ResolvedLook["duvet"] = null;
  let lamp: Look | null = null;
  for (const t of tiles) {
    const bed = BEDDING[t.crop];
    if (bed) {
      duvet = { role: bed.role, floral236: bed.floral236 };
      if (bed.tag && !tags.includes(bed.tag)) tags.push(bed.tag);
      continue;
    }
    if (t.crop === "sofa-177") continue;
    if (!look) {
      const next = cropLook(t.crop, pieceId);
      if (next) look = next;
    }
  }
  if (look && LAMP_MODELS.has(look.model) && (pieceId === "a-ns1" || pieceId === "a-ns2")) {
    lamp = look;
    look = cabinetOf(tiles, pieceId) ?? cabinetOf(otherNightTiles, pieceId === "a-ns1" ? "a-ns2" : "a-ns1") ?? NIGHT[scheme];
  }
  if (!look && (pieceId === "a-ns1" || pieceId === "a-ns2") && !cabinetOf(tiles, pieceId)) {
    look = cabinetOf(otherNightTiles, pieceId === "a-ns1" ? "a-ns2" : "a-ns1") ?? NIGHT[scheme];
  }
  if (!look) look = typeLook(scheme, pieceId);
  if (look?.tags) for (const tag of look.tags) if (!tags.includes(tag)) tags.push(tag);
  return { model: look?.model ?? "block", variant: look?.variant, tags, duvet, lamp };
}

function typeLook(scheme: SchemeId, id: string): Look | null {
  if (id === "sill" || id === "a-cushion") return { model: "cushionSill" };
  if (id === "proj") return { model: "projector" };
  if (id === "screen") return { model: "screen" };
  if (id === "mat") return { model: "yogaMat" };
  if (id === "fridge") return { model: "fridge" };
  if (id === "side" || id === "shoe") return { model: "cabLow", variant: "doors2" };
  if (id === "c2") return null;
  if (/^c[3-6]$/.test(id)) return { model: "chairFolding" };
  if (/^s[1-7]$/.test(id)) return { model: "stool" };
  if (scheme === "S2" && id === "rug") return { model: "rug", variant: "flat" };
  if (id === "c-rack") return { model: "rackOpen" };
  if (id === "bath-commode") return { model: "commode" };
  if (id === "a-bed" || id === "b-bed") return { model: "bed", variant: "teak" };
  return null;
}

const PART_ROLE: Record<string, Record<string, string>> = {
  "sofa/linen": { body: "soft", legs: "wood" },
  "sofa/leather": { body: "leather", legs: "metal" },
  "sofa/low": { body: "soft" },
  daybed: { frame: "wood", back: "cane", mattress: "soft", cushion: "softAccent" },
  loungeRocker: { frame: "wood", seat: "cane", cushion: "soft" },
  clubChair: { body: "wool" },
  "chairBentwood/plain": { body: "wood" },
  "chairBentwood/cane": { body: "wood", seat: "cane" },
  "chairBentwood/dark": { body: "woodDark" },
  chairY: { body: "wood", seat: "soft" },
  chairCane: { frame: "wood", seat: "cane" },
  chairFolding: { frame: "metal", seat: "soft" },
  stool: { body: "wood" },
  "tableRect/taper": { top: "wood" },
  "tableRect/cross": { top: "wood" },
  "tableRect/chunky": { top: "wood" },
  "deskRect/drawers": { top: "wood" },
  "deskRect/fork": { top: "wood" },
  "deskRect/secretary": { top: "wood" },
  "deskRect/chunky": { top: "wood" },
  "sideTable/round": { top: "wood" },
  "sideTable/square": { top: "wood" },
  "cabLow/open": { body: "wood" },
  "cabLow/doors2": { body: "wood" },
  "cabLow/tambour": { body: "wood", door: "wood" },
  "cabLow/cane": { frame: "wood", door: "cane" },
  "cabLow/metal": { body: "lacquer", frame: "metal" },
  "cabLow/round": { body: "wood" },
  "cabLow/drawers": { body: "wood" },
  "cabLow/smile": { body: "wood", pull: "wood" },
  "cabLow/shell": { body: "wood", pull: "wood" },
  "cabLow/night": { body: "wood" },
  "shelfOpen/low": { body: "wood" },
  "shelfOpen/grid": { body: "wood" },
  "shelfWall/grid": { body: "wood" },
  "shelfWall/cubby": { body: "wood" },
  "storageWall/tambour": { body: "wood", door: "wood" },
  "storageWall/metal": { body: "lacquer", frame: "metal" },
  "tallCab/glazed": { body: "wood", glass: "glass" },
  dresser: { body: "wood" },
  "bed/teak": { frame: "wood", mattress: "softLight", duvet: "soft" },
  "bed/dark": { frame: "woodDark", mattress: "softLight", duvet: "soft" },
  "bed/cherry": { frame: "wood", mattress: "softLight", duvet: "soft" },
  "headboard/slat": { body: "wood" },
  "headboard/panel": { body: "woodDark" },
  "headboard/caneFrame": { frame: "wood", panel: "cane" },
  "headboard/tall": { body: "wood" },
  "lampFloor/woodPole": { body: "wood", shade: "shade" },
  "lampFloor/bell": { body: "metal", shade: "shade" },
  "lampTable/wood": { body: "wood", shade: "shade" },
  "lampTable/waist": { body: "metal", shade: "lacquer" },
  "lampTable/paper": { shade: "shade" },
  "lampTable/pleated": { body: "metal", shade: "shade" },
  "pendant/enamel": { shade: "accent" },
  "pendant/opal": { body: "metal", shade: "glass" },
  "pendant/paper": { shade: "shade" },
  "sconce/brass": { body: "metal", shade: "shade" },
  "sconce/moon": { shade: "shade" },
  "sconce/opal": { body: "metal", shade: "glass" },
  "ceilingLight/cool": { body: "lacquer" },
  "ceilingLight/linenDrum": { shade: "soft" },
  "ceilingLight/disc": { body: "lacquer", rim: "metal" },
  "ceilingLight/paper": { shade: "shade" },
  "ceilingLight/opal": { shade: "glass" },
  mirror: { frame: "wood" },
  art: { frame: "wood", a: "wood", b: "soft" },
  "rug/wool": { pile: "rug" },
  "rug/flat": { pile: "rug" },
  "rug/persian": { pile: "rug" },
  "rug/rush": { pile: "rush" },
  cushionSill: { body: "soft" },
  curtain: { cloth: "soft" },
  blind: { cloth: "soft" },
  projector: { body: "metal" },
  screen: { face: "lacquer" },
  yogaMat: { body: "soft" },
  fridge: { body: "appliance" },
  commode: { body: "ceramicWhite" },
  rackOpen: { frame: "wood", cloth: "soft" },
  wardrobe: { body: "cabwhite" },
  kitchenBase: { body: "kitblue", top: "counterStone" },
  vanity: { body: "cabwhite", basin: "ceramicWhite" },
  squat: { body: "ceramicWhite" },
  shower: { glass: "glass", base: "wetTile" },
  block: { body: "appliance" },
  sillBlock: { body: "sillStone" },
};

export function partMats(
  scheme: SchemeId,
  model: string,
  variant: string | undefined,
  override: RoleOverride,
  duvet: ResolvedLook["duvet"],
  fixedExisting: Record<string, MatSpec>,
): Record<string, MatSpec> {
  const key = variant ? `${model}/${variant}` : model;
  const roles = PART_ROLE[key] ?? PART_ROLE[model] ?? { body: "soft" };
  const mats: Record<string, MatSpec> = {};
  for (const [part, role] of Object.entries(roles)) {
    if (fixedExisting[role]) mats[part] = fixedExisting[role];
    else if (duvet && part === "duvet" && duvet.floral236 && scheme === "S3") {
      mats[part] = { hex: "#b9a07a", rough: 0.85, tex: { kind: "floral", tile: 400, accent: "#6b4f3a" } };
    } else if (duvet && part === "duvet") mats[part] = resolveRole(scheme, duvet.role, override);
    else mats[part] = resolveRole(scheme, role, override);
  }
  if (model === "chairFolding") {
    const frame = scheme === "S1" ? "woodDark" : scheme === "S4" ? "wood" : "metal";
    mats.frame = resolveRole(scheme, frame, override);
  }
  if (model === "curtain" || model === "blind") {
    const cloth = scheme === "S2" ? "softLight" : "soft";
    mats.cloth = resolveRole(scheme, cloth, override);
  }
  if ((model === "projector" || model === "screen" || model === "yogaMat") && mats.body) {
    mats.body = { ...mats.body, neutralExempt: true };
  }
  if (model === "screen") mats.face = { hex: "#f3f3f1", rough: 0.4, neutralExempt: true };
  return mats;
}

export function headboardVariant(scheme: SchemeId): string {
  if (scheme === "S1") return "slat";
  if (scheme === "S2") return "panel";
  if (scheme === "S3") return "caneFrame";
  return "tall";
}

export function ceilingVariant(scheme: SchemeId): string {
  if (scheme === "S1") return "linenDrum";
  if (scheme === "S2") return "disc";
  if (scheme === "S3") return "paper";
  return "opal";
}
