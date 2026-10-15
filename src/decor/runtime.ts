import type { DecorItem } from "./types";

export const runtime = {
  frameMs: 0,
  ao: true,
  lights: 0,
  triangles: 0,
  drawCalls: 0,
  items: [] as DecorItem[],
};

let measure: (() => Promise<number>) | null = null;

export function registerMeasure(fn: () => Promise<number>) {
  measure = fn;
}

export function measureFrame() {
  return measure ? measure() : Promise.resolve(0);
}
