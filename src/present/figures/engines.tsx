/**
 * 把两套三维引擎挂进交付页的图框。
 * 引擎各自用全局 store（usePlan / useDecor），所以每次挂载前先把这张图的状态写进去，
 * 写完再挂画布（primed），保证首帧就是这张图自己的状态，而不是上一张图留下的。
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stage as DecorStage } from "../../decor/Stage";
import { useDecor } from "../../decor/store";
import { DOORS } from "../../floorplan/plan-data";
import { Stage as PlanStage } from "../../floorplan/stage";
import { usePlan } from "../../floorplan/store";
import type { LayoutFig } from "../store";
import type { DecorView } from "../../decor/store";
import type { Light, SchemeId, Stage } from "../../decor/types";
import type { Scene } from "../../floorplan/living-schemes";

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

const nextFocus = (id: string) => ({ id, n: (usePlan.getState().focus?.n ?? 0) + 1 });

/** 户型引擎：只显示客厅方案，卧室的示意家具关掉（others），标注和门开关都不用。 */
export function PlanEngine({ fig, onReady }: { fig: LayoutFig; onReady: () => void }) {
  const [primed, setPrimed] = useState(false);
  useLayoutEffect(() => {
    usePlan.setState({
      mode: fig.mode,
      section: true,
      furniture: true,
      others: false,
      labels: false,
      night: false,
      hour: 11,
      selected: null,
      scheme: fig.scheme,
      scene: fig.scene,
      doors: Object.fromEntries(DOORS.map((d) => [d.id, d.id === "M1" ? 0.35 : 0.72])),
      focus: nextFocus("L"),
    });
    setPrimed(true);
    // 只在挂载时初始化；之后的变化由下面的 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (primed) usePlan.setState({ scheme: fig.scheme, scene: fig.scene });
  }, [primed, fig.scheme, fig.scene]);
  useEffect(() => {
    if (primed) usePlan.setState({ mode: fig.mode, focus: nextFocus("L") });
  }, [primed, fig.mode]);
  return primed ? (
    <PlanStage>
      <FirstFrame onReady={onReady} />
    </PlanStage>
  ) : null;
}

type DecorFig = { scheme: SchemeId; stage: Stage; view: DecorView; light: Light; scene: Scene };

/** 装修引擎：现状图固定 L0，风格图跟着方案、阶段、视点、昼夜和场景走。 */
export function DecorEngine({ fig, onReady }: { fig: DecorFig; onReady: () => void }) {
  const [primed, setPrimed] = useState(false);
  useLayoutEffect(() => {
    useDecor.getState().apply(fig);
    usePlan.setState({ focus: nextFocus("all") });
    setPrimed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (primed) useDecor.getState().apply(fig);
  }, [primed, fig.scheme, fig.stage, fig.view, fig.light, fig.scene]); // eslint-disable-line react-hooks/exhaustive-deps
  return primed ? (
    <DecorStage>
      <FirstFrame onReady={onReady} />
    </DecorStage>
  ) : null;
}
