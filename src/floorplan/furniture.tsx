import { useMemo } from "react";
import { FURNITURE, type Furn } from "./plan-data";
import { wx, wz } from "./geometry";
import { SCHEMES, resolvePieces, toFurn } from "./living-schemes";
import { usePlan } from "./store";

function Block({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <Mat color={color} roughness={0.72} />
    </mesh>
  );
}

function Mat({
  color,
  roughness = 0.78,
  metalness = 0,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />;
}

function Bed({ w, d, color }: { w: number; d: number; color: string }) {
  const pillows = w > 1.35 ? 2 : 1;
  return (
    <group>
      <mesh position={[0, 0.16, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.28, d * 0.94]} />
        <Mat color="#8d7258" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.36, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.94, 0.16, d * 0.86]} />
        <Mat color="#f3f0ea" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.58, -d / 2 + 0.045]} castShadow>
        <boxGeometry args={[w, 1.02, 0.08]} />
        <Mat color={color} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.48, d * 0.08]} castShadow>
        <boxGeometry args={[w * 0.96, 0.08, d * 0.55]} />
        <Mat color={color} roughness={0.94} />
      </mesh>
      {Array.from({ length: pillows }, (_, i) => {
        const span = w * 0.78;
        const pw = span / pillows - 0.04;
        const x = -span / 2 + pw / 2 + i * (span / pillows);
        return (
          <mesh key={i} position={[x, 0.5, -d / 2 + 0.32]} castShadow>
            <boxGeometry args={[pw, 0.12, 0.36]} />
            <Mat color="#f7f4ee" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Wardrobe({ w, d, color }: { w: number; d: number; color: string }) {
  const n = Math.max(2, Math.round(w / 0.55));
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 2.2, d]} />
        <Mat color={color} roughness={0.58} />
      </mesh>
      {Array.from({ length: n - 1 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + ((i + 1) * w) / n, 1.12, d / 2 + 0.004]}>
          <boxGeometry args={[0.012, 2.0, 0.008]} />
          <Mat color="#c3b7a4" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <Mat color={color} roughness={0.55} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06)]} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
          <Mat color="#6e5844" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[w * 0.86, 0.05, d * 0.86]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.72, -d / 2 + 0.05]} castShadow>
        <boxGeometry args={[w * 0.86, 0.42, 0.05]} />
        <Mat color={color} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.06), 0.22, sz * (d / 2 - 0.06)]}>
          <boxGeometry args={[0.04, 0.44, 0.04]} />
          <Mat color="#5c4a3a" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Sofa({ w, d, color }: { w: number; d: number; color: string }) {
  const arm = Math.min(0.18, w * 0.12);
  return (
    <group>
      <mesh position={[0, 0.28, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.28, d * 0.92]} />
        <Mat color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.52, -d / 2 + 0.12]} castShadow>
        <boxGeometry args={[w, 0.42, 0.2]} />
        <Mat color={color} roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - arm / 2), 0.46, 0.02]} castShadow>
          <boxGeometry args={[arm, 0.36, d * 0.9]} />
          <Mat color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Table({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.045, d]} />
        <Mat color={color} roughness={0.5} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.08), 0.36, sz * (d / 2 - 0.08)]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <Mat color="#6a5340" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Coffee({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, 0.08, d]} />
      <Mat color={color} roughness={0.45} />
    </mesh>
  );
}

function TvStand({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.48, d]} />
        <Mat color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.86, d / 2 - 0.03]} castShadow>
        <boxGeometry args={[Math.min(w * 0.72, 1.45), 0.78, 0.04]} />
        <Mat color="#1c252b" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.86, d / 2 - 0.008]}>
        <boxGeometry args={[Math.min(w * 0.68, 1.38), 0.7, 0.01]} />
        <meshStandardMaterial color="#243044" roughness={0.15} metalness={0.05} emissive="#1a3350" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Rug({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <mesh position={[0, 0.012, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <Mat color={color} roughness={1} />
    </mesh>
  );
}

function Plant() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.28, 16]} />
        <Mat color="#d9d2c6" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 12]} />
        <Mat color="#6f9a5c" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 0.72, 0.05]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <Mat color="#86aa68" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Toilet() {
  return (
    <group>
      <mesh position={[0, 0.22, 0.06]} castShadow>
        <boxGeometry args={[0.38, 0.36, 0.5]} />
        <Mat color="#f4f6f7" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.42, -0.18]} castShadow>
        <boxGeometry args={[0.36, 0.32, 0.16]} />
        <Mat color="#f4f6f7" roughness={0.35} />
      </mesh>
    </group>
  );
}

function Vanity({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.8, d]} />
        <Mat color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[w * 0.42, 0.06, d * 0.55]} />
        <Mat color="#f7f8f8" roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.25, -d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.7, 0.55, 0.02]} />
        <meshStandardMaterial color="#d5dee6" metalness={0.75} roughness={0.12} />
      </mesh>
    </group>
  );
}

function GlassMat() {
  return (
    <meshStandardMaterial
      color="#c5d5de"
      transparent
      opacity={0.32}
      roughness={0.05}
      metalness={0.1}
      depthWrite={false}
    />
  );
}
function Shower({ w, d }: { w: number; d: number }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <Mat color="#d7e0e2" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.0, -d / 2]} castShadow>
        <boxGeometry args={[w, 1.9, 0.02]} />
        <GlassMat />
      </mesh>
      <mesh position={[w / 2, 1.0, 0]} castShadow>
        <boxGeometry args={[0.02, 1.9, d]} />
        <GlassMat />
      </mesh>
      <mesh position={[-w / 2, 1.0, d * 0.18]} castShadow>
        <boxGeometry args={[0.02, 1.9, d * 0.64]} />
        <GlassMat />
      </mesh>
    </group>
  );
}

function Counter({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.43, 0.03]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.78, d - 0.06]} />
        <Mat color={color} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <Mat color="#f3f0ea" roughness={0.4} />
      </mesh>
      <mesh position={[-w * 0.28, 0.88, 0.02]}>
        <boxGeometry args={[0.55, 0.03, 0.38]} />
        <meshStandardMaterial color="#c5ced4" metalness={0.45} roughness={0.28} />
      </mesh>
      <mesh position={[w * 0.12, 0.88, 0]}>
        <boxGeometry args={[0.7, 0.02, 0.4]} />
        <Mat color="#2a2e32" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.55, -d / 2 + 0.18]} castShadow>
        <boxGeometry args={[w * 0.62, 0.62, 0.34]} />
        <Mat color={color} roughness={0.58} />
      </mesh>
    </group>
  );
}

function Fridge({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 1.78, d]} />
        <Mat color={color} roughness={0.35} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.15, d / 2 + 0.004]}>
        <boxGeometry args={[w * 0.9, 0.012, 0.008]} />
        <Mat color="#9aa3a8" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Piece({ f }: { f: Furn }) {
  const w = f.w / 1000;
  const d = f.d / 1000;
  const body = (() => {
    switch (f.type) {
      case "bed":
        return <Bed w={w} d={d} color={f.color} />;
      case "wardrobe":
        return <Wardrobe w={w} d={d} color={f.color} />;
      case "desk":
        return <Desk w={w} d={d} color={f.color} />;
      case "chair":
        return <Chair w={w} d={d} color={f.color} />;
      case "sofa":
        return <Sofa w={w} d={d} color={f.color} />;
      case "table":
        return <Table w={w} d={d} color={f.color} />;
      case "coffeetable":
        return <Coffee w={w} d={d} color={f.color} />;
      case "tvstand":
        return <TvStand w={w} d={d} color={f.color} />;
      case "rug":
        return <Rug w={w} d={d} color={f.color} />;
      case "plant":
        return <Plant />;
      case "toilet":
        return <Toilet />;
      case "vanity":
        return <Vanity w={w} d={d} color={f.color} />;
      case "shower":
        return <Shower w={w} d={d} />;
      case "counter":
        return <Counter w={w} d={d} color={f.color} />;
      case "fridge":
        return <Fridge w={w} d={d} color={f.color} />;
      case "block":
        return <Block w={w} d={d} h={(f.h ?? 400) / 1000} color={f.color} />;
      default:
        return null;
    }
  })();
  return (
    <group position={[wx(f.cx), (f.z ?? 0) / 1000, wz(f.cy)]} rotation={[0, (-f.rot * Math.PI) / 180, 0]}>
      {body}
    </group>
  );
}

export function Furniture() {
  const on = usePlan((s) => s.furniture);
  const others = usePlan((s) => s.others);
  const scheme = usePlan((s) => s.scheme);
  const scene = usePlan((s) => s.scene);
  const items = useMemo(() => {
    const rest = others ? FURNITURE.filter((f) => f.room !== "L") : [];
    if (scheme === "show") return others ? FURNITURE : FURNITURE.filter((f) => f.room === "L");
    const plan = SCHEMES.find((s) => s.id === scheme);
    const living = plan ? resolvePieces(plan, scene).map(toFurn) : [];
    return [...rest, ...living];
  }, [others, scheme, scene]);
  if (!on) return null;
  return (
    <group>
      {items.map((f) => (
        <Piece key={`${f.room}-${f.id}`} f={f} />
      ))}
    </group>
  );
}
