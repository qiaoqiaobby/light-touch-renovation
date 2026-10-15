declare module "*.mjs" {
  export const SCHEMES: unknown;
  export const RULES: {
    deltaE: number;
    neutralChroma: number;
    cropCover: number;
    mainMax: number;
    accentMax: number;
    bedroomWalk: number;
    bedSide: number;
    bedSideLength: number;
  };
  export const FIXED: unknown;
  export const RETAINED: unknown;
  export const BOARD_ROOMS: unknown;
  export const BANNED: string[];
  export function hexToLab(hex: string): [number, number, number];
  export function deltaE00(a: [number, number, number], b: [number, number, number]): number;
  export function chroma(lab: [number, number, number]): number;
}

declare module "node:fs" {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string): void;
}

declare const process: {
  argv: string[];
  exitCode: number | undefined;
};
