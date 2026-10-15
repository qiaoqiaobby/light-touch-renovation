import type { MatSpec, SchemeId } from "./types";

function m(hex: string, rough: number, extra: Partial<MatSpec> = {}): MatSpec {
  return { hex, rough, ...extra };
}
function tex(kind: MatSpec["tex"] extends infer T ? T extends { kind: infer K } ? K : never : never, tile: number, accent: string) {
  return { kind, tile, accent } as NonNullable<MatSpec["tex"]>;
}

const shadeEmissive = "#ffd2a0";

/** 颜色全部来自拼贴板色板，或彩度足够低的中性色。缺角色时按 FALLBACK 回退。 */
export const ROLES: Record<SchemeId, Record<string, MatSpec>> = {
  S1: {
    wood: m("#b5794a", 0.55, { tex: tex("wood", 900, "#8d5c34") }),
    woodDark: m("#5a3f2c", 0.55, { tex: tex("wood", 900, "#3e2b1e") }),
    soft: m("#cdbfa8", 0.8, { sheen: 0.6, tex: tex("linen", 200, "#b5a890") }),
    softLight: m("#ebe5da", 0.85, { tex: tex("linen", 200, "#d5cec2") }),
    rug: m("#cdbfa8", 1, { tex: tex("wool", 600, "#b5a890") }),
    lacquer: m("#ebe5da", 0.4),
    metal: m("#5a3f2c", 0.55, { tex: tex("wood", 900, "#3e2b1e") }),
    shade: m("#ebe5da", 0.7, { emissive: shadeEmissive }),
  },
  S2: {
    wood: m("#8e4e30", 0.5, { tex: tex("wood", 900, "#6d3a22") }),
    woodDark: m("#8e4e30", 0.5, { tex: tex("wood", 900, "#6d3a22") }),
    soft: m("#bfb6a6", 0.85, { tex: tex("linen", 200, "#a79e8e") }),
    softLight: m("#e8e6e2", 0.85, { tex: tex("linen", 200, "#d0cdc8") }),
    leather: m("#6b645b", 0.5, { sheen: 0.2 }),
    rug: m("#8a8580", 1, { tex: tex("wool", 600, "#736e69") }),
    lacquer: m("#e8e6e2", 0.35),
    metal: m("#222222", 0.45, { metal: 0.6 }),
    accent: m("#2f74a6", 0.3),
    shade: m("#e8e6e2", 0.7, { emissive: shadeEmissive }),
  },
  S3: {
    wood: m("#6b4f3a", 0.55, { tex: tex("wood", 900, "#4e3929") }),
    woodLight: m("#b9a07a", 0.55, { tex: tex("wood", 900, "#9a8462") }),
    soft: m("#d8d0c2", 0.85, { tex: tex("linen", 200, "#c0b8aa") }),
    softAccent: m("#4a5a42", 0.85, { tex: tex("linen", 200, "#3c4a36") }),
    cane: m("#b9a07a", 0.7, { tex: tex("cane", 150, "#8d7048") }),
    rush: m("#b9a07a", 0.9, { tex: tex("tatami", 900, "#9a8462") }),
    plaster: m("#d8d0c2", 0.95, { tex: tex("plaster", 1200, "#c0b8aa") }),
    lacquer: m("#d8d0c2", 0.45),
    metal: m("#6b4f3a", 0.55, { tex: tex("wood", 900, "#4e3929") }),
    shade: m("#d8d0c2", 0.7, { emissive: shadeEmissive }),
  },
  S4: {
    wood: m("#7a3f24", 0.5, { tex: tex("wood", 900, "#5c2e1a") }),
    soft: m("#d8cfbf", 0.85, { tex: tex("linen", 200, "#c0b6a6") }),
    wool: m("#d8cfbf", 1, { tex: tex("wool", 600, "#c0b6a6") }),
    metal: m("#9a7a45", 0.35, { metal: 0.85 }),
    rug: m("#5a2620", 1, { tex: tex("persian", 1900, "#d8cfbf") }),
    print: m("#c98fa9", 0.8, { tex: tex("stripe", 80, "#d8cfbf") }),
    floral: m("#d8cfbf", 0.85, { tex: tex("floral", 400, "#c98fa9") }),
    lacquer: m("#d8cfbf", 0.4),
    glass: m("#f0ece2", 0.15, { emissive: shadeEmissive }),
    shade: m("#d8cfbf", 0.6, { emissive: shadeEmissive }),
  },
};

const FALLBACK: Record<string, string[]> = {
  woodDark: ["wood"],
  woodLight: ["wood"],
  softLight: ["soft"],
  softAccent: ["soft"],
  accent: ["lacquer"],
  print: ["soft"],
  floral: ["soft"],
  cane: ["soft"],
  rush: ["soft"],
  plaster: ["soft"],
  leather: ["soft"],
  wool: ["rug", "soft"],
  glass: ["shade", "soft"],
  rug: ["soft"],
  metal: ["wood"],
  lacquer: ["soft"],
  shade: ["soft"],
};

export type RoleOverride = { scheme: SchemeId; role: string; hex: string } | null;

export function resolveRole(scheme: SchemeId, name: string, override: RoleOverride = null): MatSpec {
  const table = ROLES[scheme];
  const chain = [name, ...(FALLBACK[name] ?? [])];
  for (const key of chain) {
    const found = table[key];
    if (!found) continue;
    const spec = { ...found, tex: found.tex ? { ...found.tex } : undefined };
    if (override && override.scheme === scheme && (key === override.role || name === override.role)) spec.hex = override.hex;
    return spec;
  }
  const soft = table.soft ?? table.wood;
  return { ...soft };
}
