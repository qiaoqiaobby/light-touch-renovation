import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { ROOMS } from "../floorplan/plan-data";
import { wx, wz } from "../floorplan/geometry";
import { LIGHT } from "./light-tune";
import { setGlow } from "./materials";
import type { LightSpec } from "./types";
import { useDecor } from "./store";

let rectReady = false;

function windowLights() {
  const lights: { position: [number, number, number]; size: [number, number]; target: [number, number, number] }[] = [];
  for (const room of ROOMS) {
    const poly = room.poly;
    room.glass.forEach((glass) => {
      const a = poly[glass.edge];
      const b = poly[(glass.edge + 1) % poly.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) / 1000;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const nlen = Math.hypot(dx, dy) || 1;
      let nx = -dy / nlen;
      let ny = dx / nlen;
      const inside = (x: number, y: number) => {
        let hit = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i];
          const [xj, yj] = poly[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0001) + xi) hit = !hit;
        }
        return hit;
      };
      if (!inside(mx + nx * 80, my + ny * 80)) {
        nx = -nx;
        ny = -ny;
      }
      const head = 2.15;
      const height = Math.max(0.4, head - glass.sill);
      const y = glass.sill + height / 2;
      lights.push({
        position: [wx(mx + nx * 50), y, wz(my + ny * 50)],
        size: [len, height],
        target: [wx(mx + nx * 400), y, wz(my + ny * 400)],
      });
    });
  }
  return lights;
}

export function Lighting({ lights }: { lights: LightSpec[] }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const night = useDecor((s) => s.light) === "night";
  const wins = useMemo(() => windowLights(), []);
  useLayoutEffect(() => {
    if (!rectReady) {
      RectAreaLightUniformsLib.init();
      rectReady = true;
    }
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
    gl.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useLayoutEffect(() => {
    setGlow(night);
    scene.environmentIntensity = night ? 0.04 : 0.55;
  }, [night, scene]);
  return (
    <group>
      <hemisphereLight args={[night ? "#dfe7ee" : "#dfe7ee", night ? "#c8c0b2" : "#c8c0b2", (night ? 0.04 : 0.9) * (night ? LIGHT.night : LIGHT.day)]} />
      {night ? null : (
        <directionalLight
          color="#eef3f8"
          intensity={1.6 * LIGHT.day}
          position={[0, 9, -14]}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-radius={5}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
        />
      )}
      {night
        ? null
        : wins.map((win, i) => (
          <rectAreaLight key={i} color="#e9eff5" intensity={2.5 * LIGHT.day} width={win.size[0]} height={win.size[1]} position={win.position} lookAt={undefined} />
        ))}
      {night
        ? lights.map((light, i) => (
          <pointLight
            key={i}
            color={light.color}
            intensity={light.intensity * LIGHT.night}
            distance={0}
            decay={2}
            position={[wx(light.at[0]), light.at[2] / 1000, wz(light.at[1])]}
            castShadow={light.shadow}
            shadow-mapSize={light.shadow ? [512, 512] : undefined}
            shadow-bias={-0.002}
          />
        ))
        : null}
      <LookWins wins={wins} night={night} />
    </group>
  );
}

function LookWins({ wins, night }: { wins: ReturnType<typeof windowLights>; night: boolean }) {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    if (night) return;
    const areas: THREE.RectAreaLight[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.RectAreaLight) areas.push(obj);
    });
    areas.forEach((area, i) => {
      const win = wins[i];
      if (win) area.lookAt(win.target[0], win.target[1], win.target[2]);
    });
  }, [night, scene, wins]);
  return null;
}
