import { useEffect, useMemo, type ReactElement } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { DecorItem } from "../types";
import { mat } from "../materials";
import { useDecor } from "../store";
import { dims, MatMesh, leg } from "./parts";

function Sofa({ item }: { item: DecorItem }) {
  const { w, d } = dims(item);
  const low = item.variant === "low";
  const leather = item.variant === "leather";
  const body = item.mats.body;
  const seatY = low ? 0.38 : 0.42;
  const n = Math.max(1, Math.round(w / 0.8));
  const seatW = (w - 0.08) / n;
  const ys = [-d / 2 + 0.08, d / 2 - 0.08];
  const xs = [-w / 2 + 0.08, w / 2 - 0.08];
  return (
    <group>
      {!low && xs.flatMap((x) => ys.map((z) => leg(x, z, 0.08, leather ? item.mats.legs : item.mats.legs, leather)))}
      <MatMesh args={[w - 0.06, 0.1, d - 0.06]} position={[0, low ? 0.05 : 0.13, 0]} spec={body} />
      {Array.from({ length: n }, (_, i) => (
        <MatMesh key={i} args={[seatW - 0.02, 0.16, d * 0.62]} position={[(i - (n - 1) / 2) * seatW, seatY - 0.04, 0.02]} spec={body} radius={0.04} />
      ))}
      <MatMesh args={[w - (low ? 0.04 : 0.28), 0.42, 0.18]} position={[0, seatY + 0.12, -d / 2 + 0.12]} spec={body} radius={0.03} />
      {!low ? <MatMesh args={[0.16, 0.58, d * 0.72]} position={[-w / 2 + 0.1, 0.29, 0.02]} spec={body} radius={0.02} /> : null}
      {!low ? <MatMesh args={[0.16, 0.58, d * 0.72]} position={[w / 2 - 0.1, 0.29, 0.02]} spec={body} radius={0.02} /> : null}
    </group>
  );
}

function Daybed({ item }: { item: DecorItem }) {
  const { w, d } = dims(item);
  const wood = item.mats.frame;
  const cane = item.mats.back;
  const soft = item.mats.mattress;
  const accent = item.mats.cushion;
  return (
    <group>
      <MatMesh args={[w, 0.1, d]} position={[0, 0.05, 0]} spec={wood} />
      <MatMesh args={[w, 0.3, 0.04]} position={[0, 0.25, -d / 2 + 0.03]} spec={cane} />
      <MatMesh args={[w - 0.1, 0.15, d - 0.1]} position={[0, 0.18, 0.02]} spec={soft} radius={0.02} />
      {[-0.28, 0, 0.28].map((x) => (
        <MatMesh key={x} args={[0.4, 0.4, 0.15]} position={[x * w, 0.42, -d / 2 + 0.2]} spec={accent} radius={0.04} />
      ))}
    </group>
  );
}

function Bed({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const frameH = Math.max(0.04, h - 0.22);
  const mattressL = item.key === "a-bed" ? Math.min(1.95, d - 0.05) : d - (item.key === "b-bed" ? 0.05 : 0);
  const shift = item.key === "a-bed" ? (d - mattressL) / 2 : 0;
  const duvet = item.mats.duvet ?? item.mats.mattress;
  return (
    <group>
      <MatMesh args={[w, frameH, d]} position={[0, frameH / 2, 0]} spec={item.mats.frame} radius={0.01} />
      {item.key === "b-bed" ? <MatMesh args={[w, 1, 0.05]} position={[0, 0.5, -d / 2 + 0.03]} spec={item.mats.frame} /> : null}
      <MatMesh args={[w - 0.08, 0.22, mattressL]} position={[0, frameH + 0.11, shift]} spec={item.mats.mattress} radius={0.02} />
      <MatMesh args={[w + 0.04, 0.06, mattressL * 0.66 + 0.2]} position={[0, frameH + 0.25, shift + mattressL * 0.16]} spec={duvet} />
      <MatMesh args={[0.6, 0.12, 0.4]} position={[-w * 0.18, frameH + 0.3, shift - mattressL / 2 + 0.28]} spec={item.mats.mattress} radius={0.03} />
      <MatMesh args={[0.6, 0.12, 0.4]} position={[w * 0.18, frameH + 0.3, shift - mattressL / 2 + 0.28]} spec={item.mats.mattress} radius={0.03} />
      <MatMesh args={[w * 0.7, 0.02, 0.5]} position={[0, frameH + 0.28, shift + mattressL / 2 - 0.28]} spec={item.mats.body ?? duvet} />
    </group>
  );
}

function Headboard({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  if (item.variant === "caneFrame") {
    return (
      <group>
        <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.frame} />
        <MatMesh args={[w * 0.86, h * 0.78, d * 0.4]} position={[0, h * 0.5, 0]} spec={item.mats.panel} />
      </group>
    );
  }
  if (item.variant === "slat") {
    const n = Math.max(4, Math.round(w / 0.072));
    const slat = 0.06;
    return (
      <group>
        {Array.from({ length: n }, (_, i) => (
          <MatMesh key={i} args={[slat, h, d]} position={[(i - (n - 1) / 2) * (slat + 0.012), h / 2, 0]} spec={item.mats.body} />
        ))}
      </group>
    );
  }
  return <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={item.variant === "tall" ? 0.12 : 0.006} />;
}

function ChairBent({ item }: { item: DecorItem }) {
  const spec = item.mats.body;
  const seat = item.mats.seat ?? spec;
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.03, 20]} />
        <primitive object={mat(seat)} attach="material" />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.15, 0.22, z * 0.15]} rotation={[0, 0, x * -0.07]} castShadow>
          <cylinderGeometry args={[0.012, 0.016, 0.44, 8]} />
          <primitive object={mat(spec)} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.78, -0.16]} castShadow>
        <torusGeometry args={[0.18, 0.012, 8, 18, Math.PI]} />
        <primitive object={mat(spec)} attach="material" />
      </mesh>
    </group>
  );
}

function ChairY({ item }: { item: DecorItem }) {
  const wood = item.mats.body;
  return (
    <group>
      <MatMesh args={[0.4, 0.03, 0.4]} position={[0, 0.46, 0]} spec={item.mats.seat} />
      <MatMesh args={[0.04, 0.46, 0.04]} position={[-0.16, 0.23, 0.16]} spec={wood} />
      <MatMesh args={[0.04, 0.46, 0.04]} position={[0.16, 0.23, 0.16]} spec={wood} />
      <MatMesh args={[0.04, 0.9, 0.04]} position={[-0.16, 0.45, -0.16]} spec={wood} />
      <MatMesh args={[0.04, 0.9, 0.04]} position={[0.16, 0.45, -0.16]} spec={wood} />
      <MatMesh args={[0.28, 0.36, 0.02]} position={[0, 0.78, -0.16]} spec={wood} />
    </group>
  );
}

function ChairCane({ item }: { item: DecorItem }) {
  return (
    <group>
      <MatMesh args={[0.46, 0.04, 0.46]} position={[0, 0.42, 0]} spec={item.mats.seat} />
      <MatMesh args={[0.5, 0.04, 0.46]} position={[0, 0.7, -0.02]} rotation={[0.2, 0, 0]} spec={item.mats.seat} />
      <MatMesh args={[0.04, 0.48, 0.42]} position={[-0.2, 0.24, 0]} rotation={[0, 0, 0.15]} spec={item.mats.frame} />
      <MatMesh args={[0.04, 0.48, 0.42]} position={[0.2, 0.24, 0]} rotation={[0, 0, -0.15]} spec={item.mats.frame} />
    </group>
  );
}

function Rocker({ item }: { item: DecorItem }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.48, 0.04, 0.46]} />
        <primitive object={mat(item.mats.seat)} attach="material" />
      </mesh>
      <MatMesh args={[0.46, 0.5, 0.04]} position={[0, 0.7, -0.2]} spec={item.mats.seat} />
      <MatMesh args={[0.42, 0.06, 0.42]} position={[0, 0.48, 0.02]} spec={item.mats.cushion} radius={0.02} />
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.08, 0]}>
        <torusGeometry args={[0.28, 0.015, 6, 16, Math.PI]} />
        <primitive object={mat(item.mats.frame)} attach="material" />
      </mesh>
    </group>
  );
}

function Club({ item }: { item: DecorItem }) {
  const { w, d } = dims(item);
  const r = Math.min(w, d) / 2 * 0.92;
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.96, 0.4, 24]} />
        <primitive object={mat(item.mats.body)} attach="material" />
      </mesh>
      <mesh position={[0, 0.55, -r * 0.2]} rotation={[0.4, 0, 0]} castShadow>
        <torusGeometry args={[r * 0.85, 0.12, 8, 20, (200 * Math.PI) / 180]} />
        <primitive object={mat(item.mats.body)} attach="material" />
      </mesh>
    </group>
  );
}

function Folding({ item }: { item: DecorItem }) {
  const spec = item.mats.frame;
  const seat = item.mats.seat;
  return (
    <group>
      <MatMesh args={[0.42, 0.02, 0.4]} position={[0, 0.46, 0]} spec={seat} />
      <MatMesh args={[0.42, 0.32, 0.02]} position={[0, 0.72, -0.18]} spec={seat} />
      <MatMesh args={[0.018, 0.8, 0.018]} position={[-0.2, 0.4, 0.16]} spec={spec} />
      <MatMesh args={[0.018, 0.8, 0.018]} position={[0.2, 0.4, 0.16]} spec={spec} />
      <MatMesh args={[0.018, 0.9, 0.018]} position={[-0.2, 0.45, -0.16]} spec={spec} />
      <MatMesh args={[0.018, 0.9, 0.018]} position={[0.2, 0.45, -0.16]} spec={spec} />
    </group>
  );
}

function Stool({ item }: { item: DecorItem }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.035, 18]} />
        <primitive object={mat(item.mats.body)} attach="material" />
      </mesh>
      {[0, 2, 4].map((k) => (
        <mesh key={k} position={[Math.cos(k) * 0.12, 0.22, Math.sin(k) * 0.12]} rotation={[0, 0, 0.1]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.44, 8]} />
          <primitive object={mat(item.mats.body)} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Table({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const spec = item.mats.top;
  if (item.w <= 300) {
    return <MatMesh args={[Math.max(w, 0.25), h, 0.25]} position={[0, h / 2, -d / 2 + 0.12]} spec={spec} />;
  }
  const top = <MatMesh args={[w, 0.03, d]} position={[0, h - 0.015, 0]} spec={spec} />;
  if (item.variant === "cross") {
    return (
      <group>
        {top}
        <MatMesh args={[0.04, h - 0.04, d - 0.12]} position={[0, (h - 0.04) / 2, 0]} spec={spec} />
        <MatMesh args={[w - 0.12, h - 0.04, 0.04]} position={[0, (h - 0.04) / 2, 0]} spec={spec} />
      </group>
    );
  }
  if (item.variant === "chunky") {
    return (
      <group>
        {top}
        <MatMesh args={[0.06, h - 0.05, d * 0.7]} position={[-w * 0.28, (h - 0.05) / 2, 0]} rotation={[0, 0, 0.18]} spec={spec} />
        <MatMesh args={[0.06, h - 0.05, d * 0.7]} position={[w * 0.28, (h - 0.05) / 2, 0]} rotation={[0, 0, -0.18]} spec={spec} />
      </group>
    );
  }
  return (
    <group>
      {top}
      <MatMesh args={[w - 0.1, 0.08, d - 0.1]} position={[0, h - 0.07, 0]} spec={spec} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * (w / 2 - 0.06), (h - 0.12) / 2, z * (d / 2 - 0.06)]} castShadow>
          <cylinderGeometry args={[0.03, 0.045, h - 0.12, 8]} />
          <primitive object={mat(spec)} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const spec = item.mats.top;
  if (item.variant === "secretary") {
    return (
      <group>
        <MatMesh args={[w, 1.1, d]} position={[0, 0.55, 0]} spec={spec} radius={0.006} />
        <MatMesh args={[w * 0.92, 0.02, d * 0.7]} position={[0, 0.76, d * 0.2]} spec={spec} />
      </group>
    );
  }
  return (
    <group>
      <Table item={{ ...item, variant: item.variant === "chunky" ? "chunky" : item.variant === "fork" ? "cross" : "taper" }} />
      {item.variant === "drawers" ? <MatMesh args={[w * 0.42, 0.22, d * 0.8]} position={[-w * 0.2, h - 0.2, 0]} spec={spec} /> : null}
    </group>
  );
}

function CabLow({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const body = item.mats.body;
  const door = item.mats.door ?? body;
  const frame = item.mats.frame ?? body;
  const radius = item.variant === "round" ? 0.05 : 0.006;
  const open = item.variant === "open";
  const cols = Math.max(1, Math.round(w / 0.4));
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={body} radius={radius} />
      {item.variant === "metal" ? <MatMesh args={[w + 0.012, h * 0.92, 0.012]} position={[0, h * 0.5, d / 2]} spec={frame} /> : null}
      {item.variant === "metal" ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => leg(x * (w / 2 - 0.04), z * (d / 2 - 0.04), 0.12, frame, true)) : null}
      {open ? Array.from({ length: cols - 1 }, (_, i) => (
        <MatMesh key={i} args={[0.012, h * 0.86, d * 0.9]} position={[(i + 1) * (w / cols) - w / 2, h * 0.48, 0]} spec={frame} />
      )) : null}
      {!open && item.variant !== "metal" ? <MatMesh args={[w * 0.92, h * 0.86, 0.008]} position={[0, h * 0.5, d / 2 - 0.004]} spec={door} /> : null}
      {(item.variant === "drawers" || item.variant === "smile" || item.variant === "night") ? [0.72, 0.48, 0.24].slice(0, item.variant === "night" ? 1 : 3).map((t) => (
        <mesh key={t} position={[w * 0.3, h * t, d / 2 + 0.01]} castShadow>
          {item.variant === "smile" ? <torusGeometry args={[0.04, 0.008, 6, 12, Math.PI]} /> : <sphereGeometry args={[0.012, 8, 8]} />}
          <primitive object={mat(item.mats.pull ?? frame)} attach="material" />
        </mesh>
      )) : null}
    </group>
  );
}

function ShelfOpen({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const spec = item.mats.body;
  if (item.variant === "grid") {
    const n = Math.max(1, Math.round(w / 0.36));
    const m = Math.max(1, Math.round(h / 0.36));
    return (
      <group>
        {Array.from({ length: n + 1 }, (_, i) => (
          <MatMesh key={`v${i}`} args={[0.018, h, d]} position={[(i / n - 0.5) * w, h / 2, 0]} spec={spec} />
        ))}
        {Array.from({ length: m + 1 }, (_, i) => (
          <MatMesh key={`h${i}`} args={[w, 0.018, d]} position={[0, (i / m) * h, 0]} spec={spec} />
        ))}
      </group>
    );
  }
  return (
    <group>
      {[0, 0.5, 1].map((t) => <MatMesh key={t} args={[w, 0.02, d]} position={[0, t * h, 0]} spec={spec} />)}
      <MatMesh args={[0.02, h, d]} position={[-w / 2, h / 2, 0]} spec={spec} />
      <MatMesh args={[0.02, h, d]} position={[w / 2, h / 2, 0]} spec={spec} />
    </group>
  );
}

function ShelfWall({ item }: { item: DecorItem }) {
  return <ShelfOpen item={{ ...item, variant: item.variant === "cubby" ? "low" : "grid" }} />;
}

function StorageWall({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const body = item.mats.body;
  const door = item.mats.door ?? body;
  const frame = item.mats.frame ?? door;
  const tambour = item.variant === "tambour";
  const kick = 0.06;
  const innerH = Math.max(0.2, h - kick);
  const slats = useMemo(() => {
    if (!tambour) return null;
    const n = Math.max(8, Math.min(24, Math.round(w / 0.07)));
    const span = w * 0.92;
    const step = span / n;
    const slatH = innerH * 0.9;
    const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const geo = new THREE.BoxGeometry(step * 0.62, slatH, 0.018);
      geo.translate(-span / 2 + step * (i + 0.5), kick + innerH * 0.5, d / 2 + 0.008);
      list.push(geo);
    }
    const merged = list.length === 1 ? list[0] : mergeGeometries(list);
    if (!merged) return null;
    if (list.length > 1) list.forEach((geo) => geo.dispose());
    return merged;
  }, [tambour, w, d, innerH, kick]);
  useEffect(() => () => slats?.dispose(), [slats]);
  return (
    <group>
      <MatMesh args={[w, innerH, d]} position={[0, kick + innerH / 2, 0]} spec={body} radius={0.004} />
      {tambour ? (
        <>
          <MatMesh args={[w * 0.94, innerH * 0.92, 0.008]} position={[0, kick + innerH * 0.5, d / 2 - 0.012]} spec={body} />
          {slats ? (
            <mesh geometry={slats} receiveShadow>
              <primitive object={mat(door)} attach="material" />
            </mesh>
          ) : null}
        </>
      ) : (
        <>
          <MatMesh args={[w * 0.98, innerH * 0.96, 0.01]} position={[0, kick + innerH * 0.5, d / 2 - 0.006]} spec={frame} />
          <MatMesh args={[w * 0.46, innerH * 0.86, 0.012]} position={[-w * 0.22, kick + innerH * 0.5, d / 2 + 0.002]} spec={body} />
          <MatMesh args={[w * 0.46, innerH * 0.86, 0.018]} position={[w * 0.2, kick + innerH * 0.5, d / 2 + 0.012]} spec={body} />
        </>
      )}
    </group>
  );
}

function TallCab({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.004} />
      <MatMesh args={[w * 0.86, h * 0.28, 0.012]} position={[0, h * 0.22, d / 2]} spec={item.mats.body} />
      <MatMesh args={[w * 0.8, h * 0.48, 0.006]} position={[0, h * 0.68, d / 2 + 0.004]} spec={item.mats.glass} />
    </group>
  );
}

function Dresser({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const spec = item.mats.body;
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={spec} radius={0.006} />
      <MatMesh args={[0.5, 0.7, 0.02]} position={[0, h + 0.4, -d / 2 + 0.02]} spec={spec} />
      <MatMesh args={[0.25, 0.6, 0.02]} position={[-0.34, h + 0.36, -d / 2 + 0.08]} rotation={[0, 0.5, 0]} spec={spec} />
      <MatMesh args={[0.25, 0.6, 0.02]} position={[0.34, h + 0.36, -d / 2 + 0.08]} rotation={[0, -0.5, 0]} spec={spec} />
    </group>
  );
}

function shadeMesh(spec: DecorItem["mats"][string], radius: number, height: number, y: number) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[radius, radius * 0.85, height, 18]} />
      <primitive object={mat(spec)} attach="material" />
    </mesh>
  );
}

function LampFloor({ item }: { item: DecorItem }) {
  const { h } = dims(item);
  const bell = item.variant === "bell";
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <cylinderGeometry args={[bell ? 0.012 : 0.012, 0.018, h * 0.82, 8]} />
        <primitive object={mat(item.mats.body)} attach="material" />
      </mesh>
      {shadeMesh(item.mats.shade, bell ? 0.22 : 0.2, bell ? 0.3 : 0.28, h * 0.82)}
    </group>
  );
}

function LampTable({ item }: { item: DecorItem }) {
  const paper = item.variant === "paper";
  return (
    <group>
      {paper ? (
        <mesh position={[0, 0.28, 0]} castShadow>
          <sphereGeometry args={[0.16, 18, 14]} />
          <primitive object={mat(item.mats.shade)} attach="material" />
        </mesh>
      ) : (
        <>
          <MatMesh args={[0.12, 0.04, 0.12]} position={[0, 0.02, 0]} spec={item.mats.body} />
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.02, 0.32, 8]} />
            <primitive object={mat(item.mats.body)} attach="material" />
          </mesh>
          {shadeMesh(item.mats.shade, item.variant === "pleated" ? 0.12 : 0.09, 0.16, 0.4)}
        </>
      )}
    </group>
  );
}

function Pendant({ item }: { item: DecorItem }) {
  const r = item.variant === "paper" ? 0.2 : item.variant === "enamel" ? 0.18 : 0.15;
  return (
    <group>
      <mesh position={[0, r + 0.3, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.6, 6]} />
        <primitive object={mat(item.mats.body ?? item.mats.shade)} attach="material" />
      </mesh>
      <mesh position={[0, r / 2, 0]} castShadow>
        <sphereGeometry args={[r, 18, 14]} />
        <primitive object={mat(item.mats.shade)} attach="material" />
      </mesh>
    </group>
  );
}

function Sconce({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  if (item.variant === "moon") {
    return (
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 20]} />
        <primitive object={mat(item.mats.shade)} attach="material" />
      </mesh>
    );
  }
  return (
    <group>
      <MatMesh args={[w, h * 0.4, d]} position={[0, h * 0.3, 0]} spec={item.mats.body} />
      <mesh position={[0, h * 0.65, d]} castShadow>
        <sphereGeometry args={[0.08, 14, 10]} />
        <primitive object={mat(item.mats.shade)} attach="material" />
      </mesh>
    </group>
  );
}

function Ceiling({ item }: { item: DecorItem }) {
  const spec = item.mats.shade ?? item.mats.body;
  if (item.variant === "disc") {
    return (
      <group position={[0, 0.03, 0]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
          <primitive object={mat(item.mats.body)} attach="material" />
        </mesh>
        <mesh>
          <torusGeometry args={[0.22, 0.012, 8, 24]} />
          <primitive object={mat(item.mats.rim)} attach="material" />
        </mesh>
      </group>
    );
  }
  const r = item.variant === "linenDrum" ? 0.22 : item.variant === "paper" ? 0.2 : 0.16;
  return (
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[r, r, item.variant === "opal" ? 0.08 : 0.06, 20]} />
      <primitive object={mat(spec)} attach="material" />
    </mesh>
  );
}

function Curtain({ item }: { item: DecorItem }) {
  const { w, h } = dims(item);
  const light = useDecor((s) => s.light);
  const scene = useDecor((s) => s.scene);
  const open = light === "day" && scene !== "movie";
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 48, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((2 * Math.PI * x) / 0.12) * 0.03);
    }
    g.computeVertexNormals();
    return g;
  }, [w, h]);
  const scale = open ? 0.56 : 1;
  return (
    <mesh geometry={geo} position={[0, h / 2, 0]} scale={[scale, 1, 1]}>
      <primitive object={mat(item.mats.cloth)} attach="material" />
    </mesh>
  );
}

function Blind({ item }: { item: DecorItem }) {
  const { w, h, d } = dims(item);
  return (
    <group>
      <MatMesh args={[w, 0.06, Math.max(d, 0.04)]} position={[0, h - 0.03, 0]} spec={item.mats.cloth} />
      <MatMesh args={[w, h - 0.06, 0.008]} position={[0, (h - 0.06) / 2, 0]} spec={item.mats.cloth} />
    </group>
  );
}

function Rug({ item }: { item: DecorItem }) {
  const { w, d } = dims(item);
  return <MatMesh args={[w, 0.012, d]} position={[0, 0.006, 0]} spec={item.mats.pile} radius={0.004} cast={false} />;
}

function Block({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.01} />;
}

function Wardrobe({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const n = w > 1.4 ? 3 : 2;
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.004} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <MatMesh key={i} args={[0.008, h * 0.92, 0.012]} position={[(i + 1) * (w / n) - w / 2, h / 2, d / 2]} spec={item.mats.body} />
      ))}
    </group>
  );
}

function Kitchen({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h - 0.04, d - 0.02]} position={[0, (h - 0.04) / 2, 0]} spec={item.mats.body} />
      <MatMesh args={[w, 0.04, d]} position={[0, h - 0.02, 0]} spec={item.mats.top} />
      <MatMesh args={[w * 0.28, 0.02, d * 0.45]} position={[-w * 0.2, h + 0.005, 0]} spec={item.mats.top} />
    </group>
  );
}

function Vanity({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} />
      <MatMesh args={[w * 0.42, 0.06, d * 0.5]} position={[0, h + 0.02, 0]} spec={item.mats.basin} />
      <MatMesh args={[w * 0.7, 0.5, 0.02]} position={[0, h + 0.4, -d / 2 + 0.02]} spec={item.mats.body} />
    </group>
  );
}

function Squat({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.02} />
      <mesh position={[0, h + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, Math.min(w, d) * 0.28, 20]} />
        <primitive object={mat(item.mats.body)} attach="material" />
      </mesh>
    </group>
  );
}

function Shower({ item }: { item: DecorItem }) {
  const { w, d } = dims(item);
  const glass = item.mats.glass;
  return (
    <group>
      <MatMesh args={[w, 0.02, d]} position={[0, 0.01, 0]} spec={item.mats.base} cast={false} />
      <MatMesh args={[w, 1.9, 0.008]} position={[0, 0.95, -d / 2]} spec={glass} />
      <MatMesh args={[0.008, 1.9, d]} position={[w / 2, 0.95, 0]} spec={glass} />
    </group>
  );
}

function Fridge({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.01} />
      <MatMesh args={[w * 0.9, 0.012, 0.008]} position={[0, h * 0.62, d / 2]} spec={item.mats.body} />
    </group>
  );
}

function Commode({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  const spec = item.mats.body;
  return (
    <group>
      <MatMesh args={[w * 0.9, h * 0.7, d * 0.9]} position={[0, h * 0.4, 0]} spec={spec} radius={0.02} />
      <mesh position={[0, h * 0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.min(w, d) * 0.28, 0.02, 8, 18]} />
        <primitive object={mat(spec)} attach="material" />
      </mesh>
      <MatMesh args={[0.04, h * 0.45, 0.04]} position={[-w * 0.42, h * 0.55, 0]} spec={spec} />
      <MatMesh args={[0.04, h * 0.45, 0.04]} position={[w * 0.42, h * 0.55, 0]} spec={spec} />
    </group>
  );
}

function Rack({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[0.04, h, 0.04]} position={[-w / 2, h / 2, 0]} spec={item.mats.frame} />
      <MatMesh args={[0.04, h, 0.04]} position={[w / 2, h / 2, 0]} spec={item.mats.frame} />
      <MatMesh args={[w, 0.03, 0.03]} position={[0, h * 0.86, 0]} spec={item.mats.frame} />
      {Array.from({ length: 5 }, (_, i) => (
        <MatMesh key={i} args={[0.04, 0.9, 0.45]} position={[(i - 2) * w * 0.16, h * 0.42, 0]} spec={item.mats.cloth} />
      ))}
    </group>
  );
}

function Mirror({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, Math.max(d, 0.04)]} position={[0, h / 2, 0]} spec={item.mats.frame} />
      <MatMesh args={[w * 0.86, h * 0.9, 0.008]} position={[0, h / 2, d / 2]} spec={{ hex: "#d5dee6", rough: 0.12, metal: 0.6 }} />
    </group>
  );
}

function Art({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return (
    <group>
      <MatMesh args={[w, h, Math.max(d, 0.03)]} position={[0, h / 2, 0]} spec={item.mats.frame} />
      <MatMesh args={[w * 0.44, h * 0.8, 0.006]} position={[-w * 0.18, h / 2, d / 2]} spec={item.mats.a} />
      <MatMesh args={[w * 0.36, h * 0.8, 0.006]} position={[w * 0.2, h / 2, d / 2]} spec={item.mats.b} />
    </group>
  );
}

function Screen({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return <MatMesh args={[Math.max(w, 0.02), h, Math.max(d, 0.02)]} position={[0, h / 2, 0]} spec={item.mats.face} />;
}

function Projector({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} radius={0.01} />;
}

function Cushion({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return <MatMesh args={[w, Math.max(h, 0.06), d]} position={[0, Math.max(h, 0.06) / 2, 0]} spec={item.mats.body} radius={0.02} />;
}

function Book({ item }: { item: DecorItem }) {
  const { w, d, h } = dims(item);
  return <MatMesh args={[w, h, d]} position={[0, h / 2, 0]} spec={item.mats.body} />;
}

function Hosted() {
  return null;
}

export const MODELS: Record<string, (p: { item: DecorItem }) => ReactElement | null> = {
  sofa: Sofa,
  daybed: Daybed,
  bed: Bed,
  headboard: Headboard,
  chairBentwood: ChairBent,
  chairY: ChairY,
  chairCane: ChairCane,
  loungeRocker: Rocker,
  clubChair: Club,
  chairFolding: Folding,
  stool: Stool,
  tableRect: Table,
  sideTable: Table,
  deskRect: Desk,
  cabLow: CabLow,
  shelfOpen: ShelfOpen,
  shelfWall: ShelfWall,
  storageWall: StorageWall,
  tallCab: TallCab,
  dresser: Dresser,
  lampFloor: LampFloor,
  lampTable: LampTable,
  pendant: Pendant,
  sconce: Sconce,
  ceilingLight: Ceiling,
  curtain: Curtain,
  blind: Blind,
  rug: Rug,
  block: Block,
  sillBlock: Block,
  wardrobe: Wardrobe,
  kitchenBase: Kitchen,
  vanity: Vanity,
  squat: Squat,
  shower: Shower,
  fridge: Fridge,
  commode: Commode,
  rackOpen: Rack,
  mirror: Mirror,
  art: Art,
  screen: Screen,
  projector: Projector,
  yogaMat: Cushion,
  cushionSill: Cushion,
  book: Book,
  hosted: Hosted,
};
