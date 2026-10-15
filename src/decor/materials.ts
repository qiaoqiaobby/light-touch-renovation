import * as THREE from "three";
import type { MatSpec } from "./types";
import { textureFor } from "./textures";

const cache = new Map<string, THREE.MeshStandardMaterial>();
const BUMP: Partial<Record<string, number>> = { tatami: 0.5, plaster: 0.15, cane: 0.6, planks: 0.2 };

export function mat(spec: MatSpec) {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const params = {
    color: spec.tex ? "#ffffff" : spec.hex,
    roughness: spec.rough,
    metalness: spec.metal ?? 0,
  };
  const material = spec.sheen != null
    ? new THREE.MeshPhysicalMaterial({
      ...params,
      sheen: spec.sheen,
      sheenColor: new THREE.Color(spec.hex),
      sheenRoughness: 0.8,
    })
    : new THREE.MeshStandardMaterial(params);
  if (spec.tex) {
    material.map = textureFor(key, spec.tex, spec.hex);
    const bump = BUMP[spec.tex.kind];
    if (bump) {
      material.bumpMap = material.map;
      material.bumpScale = bump;
    }
  }
  if (spec.opacity != null) {
    material.transparent = true;
    material.opacity = spec.opacity;
    material.depthWrite = false;
  }
  if (spec.emissive) {
    material.emissive = new THREE.Color(spec.emissive);
    material.userData.glow = true;
    material.emissiveIntensity = 0;
  }
  cache.set(key, material);
  return material;
}

export function setGlow(night: boolean) {
  for (const material of cache.values()) {
    if (material.userData.glow) material.emissiveIntensity = night ? 1.2 : 0;
  }
}
