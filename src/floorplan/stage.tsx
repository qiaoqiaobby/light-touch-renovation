import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { usePlan } from "./store";
import { House } from "./House";
import { CameraDirector, Lighting, WalkRig } from "./rigs";

/** children 插进画布内部，交付页用它挂首帧回调。 */
export function Stage({ children }: { children?: ReactNode }) {
  return (
    <Canvas
      className="h-full w-full"
      shadows={false}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
      dpr={[1, 1.6]}
      camera={{ position: [7.2, 11.5, 8.4], fov: 42, near: 0.06, far: 80 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onPointerMissed={() => usePlan.getState().select(null)}
    >
      <Lighting />
      <House />
      <CameraDirector />
      <WalkRig />
      {children}
    </Canvas>
  );
}
