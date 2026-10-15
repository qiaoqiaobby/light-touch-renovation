import type { SchemeId, SrcKind, Stage } from "./types";

export function maxStage(id: SchemeId): Stage {
  return id === "S2" || id === "S3" ? "L3" : "L2";
}

/** 物件层级。与 scene-data 使用同一张表，审查 B 对照这里。 */
export function levelFor(scheme: SchemeId, kind: SrcKind, id: string): { level: Stage; replaces?: string[] } {
  if (kind === "fixed") return { level: "L0" };
  if (kind === "extra") {
    if (id.endsWith("-w")) return { level: "L2", replaces: [id.slice(0, -2)] };
    if (id.startsWith("ceil-")) return { level: "L0" };
    if (id === "a-headboard") return { level: "L2" };
    if (id.startsWith("bath-sconce")) return { level: "L2" };
    return { level: "L0" };
  }
  if (kind === "soft") return { level: "L1" };
  if (kind === "layout") {
    if (id === "fridge" || id === "side" || id === "shoe") return { level: "L0" };
    if (scheme === "S2" && id === "storage") return { level: "L3" };
    if (scheme === "S3" && id === "store") return { level: "L3", replaces: ["side"] };
    if (scheme === "S2" && id === "screen") return { level: "L2" };
    return { level: "L1" };
  }
  if (id === "e-shelf" || id === "c-shelf" || id === "e-lamp") return { level: "L2" };
  if (id === "l-pend" && (scheme === "S2" || scheme === "S4")) return { level: "L2" };
  return { level: "L1" };
}
