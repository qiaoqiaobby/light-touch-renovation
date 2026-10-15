import { RoundedBox } from "@react-three/drei";
import type { DecorItem, MatSpec } from "../types";
import { mat } from "../materials";

export function dims(item: DecorItem) {
  const swap = item.facing === "e" || item.facing === "w";
  return {
    w: (swap ? item.d : item.w) / 1000,
    d: (swap ? item.w : item.d) / 1000,
    h: item.h / 1000,
  };
}

export function yawOf(facing: DecorItem["facing"]) {
  if (facing === "n") return Math.PI;
  if (facing === "e") return Math.PI / 2;
  if (facing === "w") return -Math.PI / 2;
  return 0;
}

export function MatMesh({
  args,
  position,
  spec,
  radius = 0,
  cast = false,
  rotation,
}: {
  args: [number, number, number];
  position: [number, number, number];
  spec?: MatSpec;
  radius?: number;
  cast?: boolean;
  rotation?: [number, number, number];
}) {
  const material = mat(spec ?? { hex: "#d9d3c7", rough: 0.8 });
  const r = Math.min(radius, args[0] / 2, args[1] / 2, args[2] / 2);
  if (r > 0.004) {
    return (
      <RoundedBox args={args} radius={r} smoothness={2} position={position} rotation={rotation} castShadow={cast} receiveShadow>
        <primitive object={material} attach="material" />
      </RoundedBox>
    );
  }
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={args} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function leg(x: number, z: number, h: number, spec: MatSpec | undefined, metal = false) {
  if (metal) return <MatMesh key={`${x}:${z}`} args={[0.03, h, 0.03]} position={[x, h / 2, z]} spec={spec} />;
  return (
    <mesh key={`${x}:${z}`} position={[x, h / 2, z]} castShadow>
      <cylinderGeometry args={[0.02, 0.028, h, 10]} />
      <primitive object={mat(spec ?? { hex: "#8a6240", rough: 0.6 })} attach="material" />
    </mesh>
  );
}
