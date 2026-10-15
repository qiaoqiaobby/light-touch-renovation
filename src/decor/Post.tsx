import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { registerMeasure, runtime } from "./runtime";
import { useDecor } from "./store";

export function Post() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const setStats = useDecor((s) => s.setStats);
  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    const effect = new EffectComposer(gl, target);
    const renderPass = new RenderPass(scene, camera);
    const gtao = new GTAOPass(scene, camera, size.width, size.height);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.35, distanceFallOff: 1, thickness: 1 });
    effect.addPass(renderPass);
    effect.addPass(gtao);
    effect.addPass(new OutputPass());
    return { effect, gtao, renderPass };
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    composer.effect.setSize(size.width, size.height);
    composer.gtao.setSize(size.width, size.height);
  }, [composer, size]);

  useEffect(() => {
    registerMeasure(async () => {
      const px = new Uint8Array(4);
      const sync = () => gl.getContext().readPixels(0, 0, 1, 1, gl.getContext().RGBA, gl.getContext().UNSIGNED_BYTE, px);
      composer.effect.render();
      composer.effect.render();
      sync();
      const t0 = performance.now();
      gl.info.autoReset = false;
      let triangles = 0;
      let drawCalls = 0;
      for (let i = 0; i < 3; i++) {
        gl.info.reset();
        composer.effect.render();
        sync();
        triangles = gl.info.render.triangles;
        drawCalls = gl.info.render.calls;
      }
      const ms = (performance.now() - t0) / 3;
      runtime.triangles = triangles;
      runtime.drawCalls = drawCalls;
      gl.info.autoReset = true;
      const ao = ms <= 100;
      if (!ao) composer.gtao.enabled = false;
      runtime.frameMs = ms;
      runtime.ao = ao && composer.gtao.enabled;
      setStats(ms, runtime.ao);
      return ms;
    });
  }, [composer, gl, setStats]);

  useFrame(() => {
    composer.renderPass.camera = camera;
    composer.effect.render();
  }, 1);

  return null;
}
