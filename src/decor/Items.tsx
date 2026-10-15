import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { wx, wz } from "../floorplan/geometry";
import type { DecorItem } from "./types";
import { mat } from "./materials";
import { MODELS } from "./models";
import { yawOf } from "./models/parts";

function Books({ items }: { items: DecorItem[] }) {
  const geos = useMemo(() => {
    const byColor = new Map<string, THREE.BufferGeometry[]>();
    for (const item of items) {
      const hex = item.mats.body?.hex ?? "#c9c4b8";
      const list = byColor.get(hex) ?? [];
      const geo = new THREE.BoxGeometry(item.w / 1000, item.h / 1000, item.d / 1000);
      geo.translate(wx(item.x + item.w / 2), item.z / 1000 + item.h / 2000, wz(item.y + item.d / 2));
      list.push(geo);
      byColor.set(hex, list);
    }
    return [...byColor.entries()].map(([hex, list]) => {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list);
      if (list.length > 1) list.forEach((item) => item.dispose());
      return { hex, geo };
    }).filter((entry) => entry.geo);
  }, [items]);
  return (
    <group>
      {geos.map((entry) => (
        <mesh key={entry.hex} geometry={entry.geo ?? undefined} receiveShadow>
          <primitive object={mat({ hex: entry.hex, rough: 0.8 })} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export function Items({ items }: { items: DecorItem[] }) {
  const books = items.filter((item) => item.model === "book");
  const rest = items.filter((item) => item.model !== "book" && item.model !== "hosted");
  return (
    <group>
      <Books items={books} />
      {rest.map((item) => {
        const Model = MODELS[item.model];
        if (!Model) throw new Error(`未注册模型：${item.model}`);
        return (
          <group
            key={item.key}
            position={[wx(item.x + item.w / 2), item.z / 1000, wz(item.y + item.d / 2)]}
            rotation={[0, yawOf(item.facing), 0]}
          >
            <Model item={item} />
          </group>
        );
      })}
    </group>
  );
}
