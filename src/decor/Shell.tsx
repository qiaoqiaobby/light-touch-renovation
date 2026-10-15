import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CEILING, DOORS, ROOMS, type Room } from "../floorplan/plan-data";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { splitWall, walls, wx, wz } from "../floorplan/geometry";
import { SlideDoor, SwingDoor } from "../floorplan/House";
import { axisEdges, overlap1 } from "./geom";
import { mat } from "./materials";
import { EXISTING } from "./retained";
import { worldUV } from "./textures";
import type { MatSpec, SurfaceSpec } from "./types";
import { useDecor } from "./store";

function shapeGeo(poly: Room["poly"]) {
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const X = wx(x);
    const Y = -wz(y);
    if (i === 0) s.moveTo(X, Y);
    else s.lineTo(X, Y);
  });
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function floorMat(id: string): MatSpec {
  if (id === "K" || id === "Bath") return EXISTING.wetTile;
  if (id === "A" || id === "B" || id === "C") return EXISTING.bedfloor;
  return EXISTING.tile;
}

function Floor({ room }: { room: Room }) {
  const geo = useMemo(() => {
    const g = shapeGeo(room.poly);
    const spec = floorMat(room.id);
    worldUV(g, (spec.tex?.tile ?? 800) / 1000);
    return g;
  }, [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, 0.005, 0]} receiveShadow>
      <primitive object={mat(floorMat(room.id))} attach="material" />
    </mesh>
  );
}

function Ceiling() {
  const view = useDecor((s) => s.view);
  if (view === "orbit") return null;
  return (
    <group>
      {ROOMS.map((room) => (
        <CeilingSlab key={room.id} room={room} />
      ))}
    </group>
  );
}

function CeilingSlab({ room }: { room: Room }) {
  const geo = useMemo(() => {
    const g = shapeGeo(room.poly);
    g.rotateX(Math.PI);
    return g;
  }, [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, CEILING - 0.01, 0]}>
      <primitive object={mat(EXISTING.ceiling)} attach="material" />
    </mesh>
  );
}

function prism(axis: "h" | "v", a0: number, a1: number, f0: number, f1: number, y0: number, y1: number) {
  const x0 = wx(axis === "h" ? a0 : f0);
  const x1 = wx(axis === "h" ? a1 : f1);
  const z0 = wz(axis === "h" ? f0 : a0);
  const z1 = wz(axis === "h" ? f1 : a1);
  return {
    position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [number, number, number],
    args: [Math.max(Math.abs(x1 - x0), 0.012), Math.max(y1 - y0, 0.012), Math.max(Math.abs(z1 - z0), 0.012)] as [number, number, number],
  };
}

function mergedBoxes(parts: { position: [number, number, number]; args: [number, number, number] }[]) {
  const geos = parts.map((part) => {
    const geo = new THREE.BoxGeometry(part.args[0], part.args[1], part.args[2]);
    geo.translate(part.position[0], part.position[1], part.position[2]);
    return geo;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((geo) => geo.dispose());
  return merged;
}

function Core() {
  const built = useMemo(() => walls(), []);
  const geos = useMemo(() => {
    const solids: { position: [number, number, number]; args: [number, number, number] }[] = [];
    const glasses: { position: [number, number, number]; args: [number, number, number] }[] = [];
    for (const wall of built) {
      const { solids: bands, glasses: panes } = splitWall(wall, CEILING);
      const mid = (wall.f0 + wall.f1) / 2;
      for (const band of bands) solids.push(prism(wall.axis, band.a0, band.a1, wall.f0, wall.f1, band.y0, band.y1));
      for (const band of panes) glasses.push(prism(wall.axis, band.a0, band.a1, mid - 8, mid + 8, band.y0, band.y1));
    }
    return {
      solid: solids.length ? mergedBoxes(solids) : null,
      glass: glasses.length ? mergedBoxes(glasses) : null,
    };
  }, [built]);
  useEffect(() => () => {
    geos.solid?.dispose();
    geos.glass?.dispose();
  }, [geos]);
  const core = mat({ hex: "#e9e6df", rough: 0.92 });
  const glass = mat(EXISTING.glass);
  return (
    <group>
      {geos.solid ? (
        <mesh geometry={geos.solid} castShadow receiveShadow>
          <primitive object={core} attach="material" />
        </mesh>
      ) : null}
      {geos.glass ? (
        <mesh geometry={geos.glass}>
          <primitive object={glass} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}

type Band = { a0: number; a1: number; y0: number; y1: number };

function splitRange(a0: number, a1: number, cuts: number[]) {
  const marks = [...new Set([a0, a1, ...cuts.filter((c) => c > a0 + 8 && c < a1 - 8)])].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < marks.length - 1; i++) if (marks[i + 1] - marks[i] > 8) out.push([marks[i], marks[i + 1]]);
  return out;
}

function Skin({ surfaces }: { surfaces: SurfaceSpec[] }) {
  const built = useMemo(() => walls(), []);
  const pieces = useMemo(() => {
    const out: { key: string; axis: "h" | "v"; a0: number; a1: number; fixed: number; inward: number; y0: number; y1: number; spec: MatSpec }[] = [];
    for (const room of ROOMS) {
      const fallback = room.id === "K" || room.id === "Bath" ? EXISTING.wallCeramic : EXISTING.wall;
      const edges = axisEdges(room.poly as [number, number][]);
      edges.forEach((edge) => {
        const mid = (edge.a0 + edge.a1) / 2;
        const probe = edge.axis === "h" ? { x: mid, y: edge.fixed } : { x: edge.fixed, y: mid };
        const inward = (dx: number, dy: number) => {
          const poly = room.poly as [number, number][];
          return pointInside(probe.x + dx, probe.y + dy, poly) ? 1 : -1;
        };
        const sign = edge.axis === "h" ? inward(0, 30) : inward(30, 0);
        const matched = built.filter((wall) => {
          if (wall.axis !== edge.axis) return false;
          const near = Math.min(Math.abs(wall.f0 - edge.fixed), Math.abs(wall.f1 - edge.fixed)) <= 15;
          return near && overlap1(wall.a0, wall.a1, edge.a0, edge.a1) > 20;
        });
        const openings = matched.flatMap((wall) => splitWall(wall, CEILING).glasses.map((g) => ({ a0: Math.max(g.a0, edge.a0), a1: Math.min(g.a1, edge.a1), sill: g.y0, head: g.y1 }))).filter((g) => g.a1 - g.a0 > 20);
        const bands: Band[] = [];
        let cursor = edge.a0;
        const holes = [...openings].sort((a, b) => a.a0 - b.a0);
        for (const hole of holes) {
          if (hole.a0 > cursor + 8) bands.push({ a0: cursor, a1: hole.a0, y0: 0, y1: CEILING });
          if (hole.sill > 0.02) bands.push({ a0: hole.a0, a1: hole.a1, y0: 0, y1: hole.sill });
          if (CEILING > hole.head + 0.02) bands.push({ a0: hole.a0, a1: hole.a1, y0: hole.head, y1: CEILING });
          cursor = Math.max(cursor, hole.a1);
        }
        if (edge.a1 > cursor + 8) bands.push({ a0: cursor, a1: edge.a1, y0: 0, y1: CEILING });
        const zones = surfaces.filter((s) => s.edge === edge.index && (s.room === room.id || (room.id === "L" && s.room === "L")));
        for (const band of bands) {
          const cuts = zones.flatMap((z) => [z.a0, z.a1]);
          for (const [a0, a1] of splitRange(band.a0, band.a1, cuts)) {
            let spec = fallback;
            for (const zone of zones) {
              if (overlap1(a0, a1, zone.a0, zone.a1) <= 0) continue;
              if (overlap1(band.y0, band.y1, zone.y0 / 1000, zone.y1 / 1000) <= 0 && zone.y1 > 20) continue;
              spec = zone.mat;
            }
            out.push({ key: `${room.id}-${edge.index}-${a0}-${band.y0}`, axis: edge.axis, a0, a1, fixed: edge.fixed, inward: sign, y0: band.y0, y1: band.y1, spec });
          }
        }
      });
    }
    return out;
  }, [built, surfaces]);
  const groups = useMemo(() => {
    const byMat = new Map<string, { spec: MatSpec; parts: { position: [number, number, number]; args: [number, number, number] }[] }>();
    for (const piece of pieces) {
      const key = JSON.stringify(piece.spec);
      const group = byMat.get(key) ?? { spec: piece.spec, parts: [] };
      const fCenter = piece.fixed + piece.inward * 8;
      group.parts.push(prism(piece.axis, piece.a0, piece.a1, fCenter - 6, fCenter + 6, piece.y0, piece.y1));
      byMat.set(key, group);
    }
    return [...byMat.values()].map((group) => ({ spec: group.spec, geo: mergedBoxes(group.parts) }));
  }, [pieces]);
  useEffect(() => () => groups.forEach((group) => group.geo.dispose()), [groups]);
  return (
    <group>
      {groups.map((group) => (
        <mesh key={JSON.stringify(group.spec)} geometry={group.geo} receiveShadow>
          <primitive object={mat(group.spec)} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function pointInside(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0001) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function Clip() {
  const gl = useThree((s) => s.gl);
  const view = useDecor((s) => s.view);
  useEffect(() => {
    gl.localClippingEnabled = true;
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.15);
    gl.clippingPlanes = view === "orbit" ? [plane] : [];
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl, view]);
  return null;
}

export function Shell({ surfaces }: { surfaces: SurfaceSpec[] }) {
  return (
    <group>
      <Clip />
      {ROOMS.map((room) => (
        <Floor key={room.id} room={room} />
      ))}
      <Ceiling />
      <Core />
      <Skin surfaces={surfaces} />
      {DOORS.map((door) =>
        door.kind === "swing" ? <SwingDoor key={door.id} door={door} height={CEILING} /> : <SlideDoor key={door.id} door={door} height={CEILING} />,
      )}
    </group>
  );
}
