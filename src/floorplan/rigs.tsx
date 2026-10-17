import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CEILING, EYE, ROOMS, SPAWN } from "./plan-data";
import { collidersFrom, walls, wx, wz } from "./geometry";
import { usePlan } from "./store";

const _cols = collidersFrom(walls());

function blocked(x: number, z: number, r: number, doors: Record<string, number>) {
  for (const c of _cols) {
    if (x < c.x0 - r || x > c.x1 + r || z < c.z0 - r || z > c.z1 + r) continue;
    const hole = c.holes.find((h) => x > h.x0 - 0.04 && x < h.x1 + 0.04 && z > h.z0 - 0.04 && z < h.z1 + 0.04);
    if (hole && (doors[hole.id] ?? 0) > 0.42) continue;
    return true;
  }
  return false;
}

function sunPos(hour: number) {
  const t = (hour - 6) / 12;
  const az = Math.PI * (0.18 + t * 0.68);
  const el = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 1.05 + 0.18;
  return [Math.cos(az) * 16, Math.sin(el) * 18 + 3, -Math.sin(az) * 11] as [number, number, number];
}

export function Lighting() {
  const night = usePlan((s) => s.night);
  const hour = usePlan((s) => s.hour);
  const { scene, gl } = useThree();
  useEffect(() => {
    const color = new THREE.Color(night ? "#15191f" : "#e4dfd4");
    scene.background = color;
    gl.setClearColor(color);
  }, [night, scene, gl]);
  const pos = sunPos(hour);
  return (
    <>
      <hemisphereLight args={["#f4efe4", "#c9c2b4", night ? 0.12 : 0.72]} />
      <ambientLight intensity={night ? 0.05 : 0.18} />
      <directionalLight
        position={pos}
        intensity={night ? 0.08 : 1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={48}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
      />
      <directionalLight position={[-8, 6, -6]} intensity={night ? 0.02 : 0.28} color="#f3efe6" />
      {night
        ? ROOMS.map((r) => {
            const xs = r.poly.map((p) => p[0]);
            const ys = r.poly.map((p) => p[1]);
            const x = (Math.min(...xs) + Math.max(...xs)) / 2;
            const y = (Math.min(...ys) + Math.max(...ys)) / 2;
            return (
              <pointLight
                key={r.id}
                position={[wx(x), CEILING - 0.35, wz(y)]}
                intensity={11}
                distance={7}
                decay={2}
                color="#ffd7a8"
              />
            );
          })
        : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color={night ? "#2a3036" : "#d4cec2"} roughness={1} />
      </mesh>
    </>
  );
}

type Pose = { p: THREE.Vector3; t: THREE.Vector3 };

function poseFor(mode: "orbit" | "top", id: string | null, houseDist: number): Pose {
  let t = new THREE.Vector3(0, 0.35, 0);
  let dist = houseDist;
  if (id && id !== "all") {
    const r = ROOMS.find((room) => room.id === id);
    if (r) {
      const xs = r.poly.map((p) => p[0]);
      const ys = r.poly.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      t = new THREE.Vector3(wx(cx), 0.4, wz(cy));
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 1000;
      dist = size * 1.2 + 2.6;
    }
  }
  if (mode === "top") return { p: new THREE.Vector3(t.x, id && id !== "all" ? dist : houseDist + 1.8, t.z + 0.02), t };
  const dir = new THREE.Vector3(0.58, 0.74, 0.48).normalize();
  return { p: t.clone().addScaledVector(dir, dist), t };
}

export function CameraDirector() {
  const mode = usePlan((s) => s.mode);
  const focus = usePlan((s) => s.focus);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update?: () => void } | null;
  const anim = useRef<{ t: number; dur: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  const key = `${mode}:${focus?.n ?? 0}:${focus?.id ?? "all"}`;
  const seen = useRef("");

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (mode === "walk") {
      anim.current = null;
      return;
    }
    if (seen.current !== key && controls) {
      seen.current = key;
      const pose = poseFor(mode === "top" ? "top" : "orbit", focus?.id ?? null, usePlan.getState().houseDist);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      anim.current = {
        t: 0,
        dur: reduce ? 0.01 : 0.85,
        fromP: camera.position.clone(),
        toP: pose.p,
        fromT: controls.target.clone(),
        toT: pose.t,
      };
      camera.fov = 42;
      camera.updateProjectionMatrix();
    }
    const a = anim.current;
    if (!a || !controls) return;
    a.t += dt;
    const u = Math.min(1, a.t / a.dur);
    const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    camera.position.lerpVectors(a.fromP, a.toP, e);
    controls.target.lerpVectors(a.fromT, a.toT, e);
    if (u >= 1) anim.current = null;
  });

  return (
    <OrbitControls
      makeDefault
      enabled={mode !== "walk"}
      enableDamping
      dampingFactor={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={1.1}
      maxDistance={30}
      target={[0, 0.35, 0]}
    />
  );
}

export function WalkRig() {
  const mode = usePlan((s) => s.mode);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const pos = useRef({ x: wx(SPAWN[0]), z: wz(SPAWN[1]) });
  const keys = useRef(new Set<string>());
  const override = useRef<Set<string> | null>(null);
  const speed = useRef(0);
  const prevE = useRef(false);
  const ray = useRef(new THREE.Raycaster());
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      override.current = null;
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const onClick = () => {
      if (usePlan.getState().mode !== "walk" || coarse) return;
      if (document.pointerLockElement !== el) el.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current -= e.movementY * 0.0022;
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current));
    };
    const onDown = (e: PointerEvent) => {
      if (usePlan.getState().mode !== "walk") return;
      if (!coarse && document.pointerLockElement === el) return;
      dragging.current = { x: e.clientX, y: e.clientY };
    };
    const onDrag = (e: PointerEvent) => {
      if (!dragging.current || usePlan.getState().mode !== "walk") return;
      const dx = e.clientX - dragging.current.x;
      const dy = e.clientY - dragging.current.y;
      dragging.current = { x: e.clientX, y: e.clientY };
      if (document.pointerLockElement === el) return;
      yaw.current -= dx * 0.005;
      pitch.current -= dy * 0.005;
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current));
    };
    const onUp = () => {
      dragging.current = null;
    };
    el.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  useEffect(() => {
    window.__controlsTest = {
      getYaw: () => yaw.current,
      getSpeed: () => speed.current,
      getPos: () => ({ x: pos.current.x, z: pos.current.z }),
      setKeys: (codes) => {
        override.current = new Set(codes);
      },
      setYaw: (v) => {
        yaw.current = v;
      },
      setPos: (x, z) => {
        pos.current.x = x;
        pos.current.z = z;
      },
    };
    return () => {
      if (window.__controlsTest?.getYaw === window.__controlsTest?.getYaw) delete window.__controlsTest;
    };
  }, []);

  useEffect(() => {
    if (mode !== "walk") {
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock();
      return;
    }
    pos.current = { x: wx(SPAWN[0]), z: wz(SPAWN[1]) };
    yaw.current = 0;
    pitch.current = -0.06;
    camera.fov = 68;
    camera.updateProjectionMatrix();
  }, [mode, camera, gl]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (mode !== "walk") {
      speed.current = 0;
      return;
    }
    const held = override.current ?? keys.current;
    const stick = usePlan.getState().stick;
    let sx = (held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) - (held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0);
    let sy = (held.has("KeyW") || held.has("ArrowUp") ? 1 : 0) - (held.has("KeyS") || held.has("ArrowDown") ? 1 : 0);
    sx += stick.x;
    sy += stick.y;
    const mag = Math.hypot(sx, sy);
    if (mag > 1) {
      sx /= mag;
      sy /= mag;
    }
    const run = held.has("ShiftLeft") || held.has("ShiftRight") ? 2.35 : 1.4;
    const yv = yaw.current;
    const fx = -Math.sin(yv);
    const fz = -Math.cos(yv);
    const rx = Math.cos(yv);
    const rz = -Math.sin(yv);
    const dx = (fx * sy + rx * sx) * run * dt;
    const dz = (fz * sy + rz * sx) * run * dt;
    const doors = usePlan.getState().doors;
    const r = 0.18;
    let nx = pos.current.x + dx;
    let nz = pos.current.z + dz;
    if (blocked(nx, pos.current.z, r, doors)) nx = pos.current.x;
    if (blocked(nx, nz, r, doors)) nz = pos.current.z;
    speed.current = Math.hypot(nx - pos.current.x, nz - pos.current.z) / Math.max(dt, 1e-4);
    pos.current.x = nx;
    pos.current.z = nz;
    camera.position.set(nx, EYE, nz);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yv;
    camera.rotation.x = pitch.current;

    const eDown = held.has("KeyE");
    if (eDown && !prevE.current) {
      ray.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = ray.current.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.userData.doorId && h.distance < 2.4);
      if (hit) usePlan.getState().toggleDoor(hit.object.userData.doorId as string);
    }
    prevE.current = eDown;
  });

  return null;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPos: () => { x: number; z: number };
      setKeys: (codes: string[]) => void;
      setYaw: (yaw: number) => void;
      setPos: (x: number, z: number) => void;
    };
  }
}
