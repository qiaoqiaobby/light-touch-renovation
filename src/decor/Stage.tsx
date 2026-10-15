import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DOORS } from "../floorplan/plan-data";
import { usePlan } from "../floorplan/store";
import { Items } from "./Items";
import { Lighting } from "./Lighting";
import { Post } from "./Post";
import { Shell } from "./Shell";
import { ViewRig } from "./ViewRig";
import { runtime } from "./runtime";
import { buildScene } from "./scene-data";
import { useDecor } from "./store";

export function Stage() {
  const scheme = useDecor((s) => s.scheme);
  const stage = useDecor((s) => s.stage);
  const scene = useDecor((s) => s.scene);
  const light = useDecor((s) => s.light);
  const built = useMemo(() => {
    const next = buildScene(scheme, stage, scene, light);
    runtime.items = next.items;
    runtime.lights = light === "night" ? next.lights.length : 0;
    return next;
  }, [scheme, stage, scene, light]);
  useEffect(() => {
    usePlan.setState({
      doors: Object.fromEntries(DOORS.map((door) => [door.id, 0])),
      furniture: false,
      labels: false,
      section: false,
    });
  }, []);
  return (
    <Canvas
      className="h-full w-full"
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.58, 4], fov: 62, near: 0.05, far: 80 }}
      gl={{ antialias: false, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <color attach="background" args={[light === "night" ? "#14181d" : "#d5dbe2"]} />
      <Lighting lights={built.lights} />
      <Shell surfaces={built.surfaces} />
      <Items items={built.items} />
      <Post />
      <ViewRig />
    </Canvas>
  );
}
