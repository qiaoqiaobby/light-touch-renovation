import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { CEILING, DOORS, ROOMS, type Door, type Room } from "./plan-data";
import { doorMotion, walls, wx, wz, type Wall } from "./geometry";
import { usePlan } from "./store";
import { Furniture } from "./furniture";

const LABEL: Record<string, [number, number]> = {
  A: [3814, 2700],
  B: [2500, 6100],
  C: [4060, 9100],
  Bath: [3800, 11240],
  K: [9600, 11600],
  L: [7300, 9600],
};

function shapeGeo(poly: Room["poly"], ceiling: boolean) {
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const X = wx(x);
    const Y = ceiling ? wz(y) : -wz(y);
    if (i === 0) s.moveTo(X, Y);
    else s.lineTo(X, Y);
  });
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(ceiling ? Math.PI / 2 : -Math.PI / 2);
  return g;
}

function Floor({ room }: { room: Room }) {
  const geo = useMemo(() => shapeGeo(room.poly, false), [room]);
  const ceil = useMemo(() => shapeGeo(room.poly, true), [room]);
  useEffect(() => () => {
    geo.dispose();
    ceil.dispose();
  }, [geo, ceil]);
  const selected = usePlan((s) => s.selected === room.id);
  const showCeil = usePlan((s) => s.mode === "walk" || !s.section);
  return (
    <group>
      <mesh
        geometry={geo}
        position={[0, 0.01, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          usePlan.getState().select(room.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          usePlan.getState().focusRoom(room.id);
        }}
      >
        <meshStandardMaterial color={selected ? "#d4e3f3" : room.floor} roughness={0.88} />
      </mesh>
      {showCeil ? (
        <mesh geometry={ceil} position={[0, CEILING, 0]}>
          <meshStandardMaterial color="#f7f4ee" roughness={1} side={THREE.BackSide} />
        </mesh>
      ) : null}
    </group>
  );
}

function prism(axis: "h" | "v", a0: number, a1: number, f0: number, f1: number, y0: number, y1: number) {
  const x0 = wx(axis === "h" ? a0 : f0);
  const x1 = wx(axis === "h" ? a1 : f1);
  const z0 = wz(axis === "h" ? f0 : a0);
  const z1 = wz(axis === "h" ? f1 : a1);
  return {
    position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [number, number, number],
    args: [Math.max(Math.abs(x1 - x0), 0.012), Math.max(y1 - y0, 0.012), Math.max(Math.abs(z1 - z0), 0.012)] as [
      number,
      number,
      number,
    ],
  };
}

function WallSolid({ wall, height }: { wall: Wall; height: number }) {
  const cuts = [...wall.openings].sort((a, b) => a.a0 - b.a0);
  const solids: { a0: number; a1: number; y0: number; y1: number }[] = [];
  const glasses: { a0: number; a1: number; y0: number; y1: number }[] = [];
  let cursor = wall.a0;
  for (const o of cuts) {
    const s0 = Math.max(o.a0, wall.a0);
    const s1 = Math.min(o.a1, wall.a1);
    if (s1 - s0 < 20) continue;
    if (s0 > cursor + 8) solids.push({ a0: cursor, a1: s0, y0: 0, y1: height });
    const head = Math.min(o.head, height);
    const sill = Math.min(o.sill, head);
    if (sill > 0.02) solids.push({ a0: s0, a1: s1, y0: 0, y1: sill });
    if (height > head + 0.02) solids.push({ a0: s0, a1: s1, y0: head, y1: height });
    if (o.kind === "window" && head - sill > 0.08) glasses.push({ a0: s0, a1: s1, y0: sill, y1: head });
    cursor = Math.max(cursor, s1);
  }
  if (wall.a1 > cursor + 8) solids.push({ a0: cursor, a1: wall.a1, y0: 0, y1: height });
  const color = wall.kind === "ext" ? "#e4ddd0" : wall.kind === "stub" ? "#ddd6c8" : "#f4f1ea";
  const midF = (wall.f0 + wall.f1) / 2;
  return (
    <group>
      {solids.map((s, i) => {
        const box = prism(wall.axis, s.a0, s.a1, wall.f0, wall.f1, s.y0, s.y1);
        return (
          <mesh key={i} position={box.position} castShadow receiveShadow>
            <boxGeometry args={box.args} />
            <meshStandardMaterial color={color} roughness={0.92} />
            <Edges threshold={18} color="#c4bdb0" />
          </mesh>
        );
      })}
      {glasses.map((g, i) => {
        const pane = prism(wall.axis, g.a0, g.a1, midF - 12, midF + 12, g.y0, g.y1);
        const length = (g.a1 - g.a0) / 1000;
        const n = Math.max(1, Math.round(length / 0.9));
        return (
          <group key={`g${i}`}>
            <mesh position={pane.position}>
              <boxGeometry args={pane.args} />
              <meshStandardMaterial
                color="#b7c9d4"
                transparent
                opacity={0.38}
                roughness={0.06}
                metalness={0.12}
                depthWrite={false}
              />
            </mesh>
            {Array.from({ length: n + 1 }, (_, k) => {
              const along = g.a0 + ((g.a1 - g.a0) * k) / n;
              const bar = prism(wall.axis, along - 18, along + 18, midF - 28, midF + 28, g.y0, g.y1);
              return (
                <mesh key={k} position={bar.position} castShadow>
                  <boxGeometry args={bar.args} />
                  <meshStandardMaterial color="#f7f4ee" roughness={0.4} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function SwingDoor({ door, height }: { door: Door; height: number }) {
  const ref = useRef<THREE.Group>(null);
  const motion = useMemo(() => doorMotion(door), [door]);
  const amount = useRef(usePlan.getState().doors[door.id] ?? 0);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const target = usePlan.getState().doors[door.id] ?? 0;
    amount.current += (target - amount.current) * Math.min(1, d * 7);
    if (ref.current) ref.current.rotation.y = motion.closed + (motion.open - motion.closed) * amount.current;
  });
  const leafH = Math.min(door.head - 0.04, height - 0.02);
  const leafL = door.width / 1000;
  if (leafH < 0.2) return null;
  const toggle = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    usePlan.getState().toggleDoor(door.id);
  };
  return (
    <group ref={ref} position={[wx(motion.hinge[0]), 0, wz(motion.hinge[1])]}>
      <mesh position={[leafL / 2, leafH / 2, 0]} castShadow userData={{ doorId: door.id }} onClick={toggle}>
        <boxGeometry args={[leafL, leafH, 0.04]} />
        <meshStandardMaterial color={door.id === "M1" ? "#6b4e38" : "#efe4d4"} roughness={0.55} />
      </mesh>
      <mesh position={[leafL - 0.08, Math.min(1, leafH - 0.08), 0.035]} onClick={toggle}>
        <sphereGeometry args={[0.028, 12, 8]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}

function SlideDoor({ door, height }: { door: Door; height: number }) {
  const ref = useRef<THREE.Group>(null);
  const amount = useRef(usePlan.getState().doors[door.id] ?? 0);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const target = usePlan.getState().doors[door.id] ?? 0;
    amount.current += (target - amount.current) * Math.min(1, d * 7);
    const g = ref.current;
    if (!g) return;
    const span = door.width / 1000;
    g.children.forEach((child, i) => {
      const base = i === 0 ? -span / 4 : span / 4;
      child.position.x = base + amount.current * span * 0.46;
    });
  });
  const leafH = Math.min(door.head - 0.05, height - 0.02);
  const panel = (door.width / 1000) * 0.52;
  if (leafH < 0.2) return null;
  const across = (door.w[0] + door.w[1]) / 2;
  const along = (door.j[0] + door.j[1]) / 2;
  const pos: [number, number, number] = door.axis === "h" ? [wx(along), 0, wz(across)] : [wx(across), 0, wz(along)];
  const rot = door.axis === "v" ? -Math.PI / 2 : 0;
  const toggle = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    usePlan.getState().toggleDoor(door.id);
  };
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <group ref={ref}>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, leafH / 2, i === 0 ? 0.02 : -0.02]} userData={{ doorId: door.id }} onClick={toggle}>
            <boxGeometry args={[panel, leafH, 0.02]} />
            <meshStandardMaterial color="#d5e2ea" transparent opacity={0.55} roughness={0.08} metalness={0.15} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function LabelSprite({ name, area, position }: { name: string; area: string; position: [number, number, number] }) {
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let dead = false;
    const draw = () => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const g = c.getContext("2d");
      if (!g) return;
      g.clearRect(0, 0, 512, 256);
      g.fillStyle = "rgba(246,243,236,0.92)";
      g.beginPath();
      g.roundRect(16, 28, 480, 200, 18);
      g.fill();
      g.fillStyle = "#1c252b";
      g.font = '600 72px "Noto Serif SC", serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(name, 256, 100);
      g.fillStyle = "#5c676e";
      g.font = '44px "Noto Sans SC", sans-serif';
      g.fillText(area, 256, 168);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      if (!dead) setMap(tex);
    };
    void Promise.all([
      document.fonts.load('600 72px "Noto Serif SC"'),
      document.fonts.load('44px "Noto Sans SC"'),
    ]).then(draw);
    return () => {
      dead = true;
    };
  }, [name, area]);
  useEffect(() => () => map?.dispose(), [map]);
  if (!map) return null;
  return (
    <sprite position={position} scale={[1.7, 0.85, 1]} renderOrder={2}>
      <spriteMaterial map={map} transparent depthTest={false} />
    </sprite>
  );
}

function Labels({ height }: { height: number }) {
  const labels = usePlan((s) => s.labels && s.mode !== "walk");
  if (!labels) return null;
  return (
    <group>
      {ROOMS.map((r) => {
        const at = LABEL[r.id];
        return (
          <LabelSprite
            key={r.id}
            name={r.name}
            area={`${r.label} ㎡`}
            position={[wx(at[0]), height + 0.42, wz(at[1])]}
          />
        );
      })}
    </group>
  );
}

export function House() {
  const built = useMemo(() => walls(), []);
  const section = usePlan((s) => s.section);
  const mode = usePlan((s) => s.mode);
  const height = mode === "walk" || !section ? CEILING : 1.15;
  return (
    <group>
      {ROOMS.map((r) => (
        <Floor key={r.id} room={r} />
      ))}
      {built.map((w) => (
        <WallSolid key={w.id} wall={w} height={height} />
      ))}
      {DOORS.map((d) =>
        d.kind === "swing" ? <SwingDoor key={d.id} door={d} height={height} /> : <SlideDoor key={d.id} door={d} height={height} />,
      )}
      <Furniture />
      <Labels height={height} />
    </group>
  );
}
