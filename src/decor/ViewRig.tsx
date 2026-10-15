import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { wx, wz } from "../floorplan/geometry";
import { CameraDirector, WalkRig } from "../floorplan/rigs";
import { usePlan } from "../floorplan/store";
import { VIEWS } from "./views";
import { useDecor } from "./store";

function FixedView() {
  const viewId = useDecor((s) => s.view);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const spec = VIEWS.find((view) => view.id === viewId) ?? VIEWS[0];

  useEffect(() => {
    yaw.current = 0;
    pitch.current = 0;
  }, [spec.id]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      yaw.current = Math.max(-0.7, Math.min(0.7, yaw.current - (e.clientX - drag.current.x) * 0.005));
      pitch.current = Math.max(-0.44, Math.min(0.44, pitch.current - (e.clientY - drag.current.y) * 0.005));
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      drag.current = null;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame(() => {
    const eye = new THREE.Vector3(wx(spec.eye[0]), 1.58, wz(spec.eye[1]));
    const target = new THREE.Vector3(wx(spec.target[0]), spec.target[2] / 1000, wz(spec.target[1]));
    const base = target.clone().sub(eye).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), base);
    quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ")));
    camera.position.copy(eye);
    camera.quaternion.copy(quat);
    camera.fov = 62;
    camera.near = 0.05;
    camera.far = 80;
    camera.updateProjectionMatrix();
  });
  return null;
}

export function ViewRig() {
  const view = useDecor((s) => s.view);
  useEffect(() => {
    usePlan.getState().setMode(view === "walk" ? "walk" : "orbit");
  }, [view]);
  if (view === "walk") return <WalkRig />;
  if (view === "orbit") return <CameraDirector />;
  return <FixedView />;
}
