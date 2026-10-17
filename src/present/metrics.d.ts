declare module "*.mjs" {
  export function doorSweep(door: unknown, poly?: [number, number][]): { cx: number; cy: number; r: number; qx: number; qy: number } | null;
  export function doorZone(door: unknown, poly: [number, number][], depth?: number): { x: number; y: number; w: number; d: number } | null;
}
