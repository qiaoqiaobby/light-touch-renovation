import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePresent, type FigId } from "../store";

/** 浏览器能否建 WebGL。不能就用平面兜底，不去挂画布。 */
export const WEBGL = (() => {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
})();

/**
 * 滚轮和触屏守门：长滚动页里，画布不能抢走页面滚动。
 * 没按 Ctrl / ⌘ 的滚轮在捕获阶段拦下，不交给 OrbitControls；触控板捏合会带 ctrlKey，照常缩放。
 * 触屏上画布默认不接收手势（styles.css 按 data-armed 控制），点「操作三维」后才接管。
 */
function Gesture({ armed, children }: { armed: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
    };
    el.addEventListener("wheel", onWheel, { capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);
  return (
    <div ref={ref} className="gesture" data-armed={armed}>
      {children}
    </div>
  );
}

type Props = {
  id: FigId;
  no: string;
  caption: string;
  /** 操作提示：鸟瞰能缩放，人眼视点只能转动 */
  hint: string;
  /** 画布下方的工具条 */
  tools?: ReactNode;
  /** 工具条下方的补充（改动清单等） */
  after?: ReactNode;
  /** WebGL 不可用时的平面兜底 */
  fallback: ReactNode;
  engine: (onReady: () => void) => ReactNode;
};

export function Figure({ id, no, caption, hint, tools, after, fallback, engine }: Props) {
  const active = usePresent((s) => s.active === id);
  const [ready, setReady] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!active) {
      setReady(false);
      setArmed(false);
    }
  }, [active]);

  return (
    <figure className="fig" data-fig={id}>
      <div className="fig-stage">
        {!WEBGL ? (
          <div className="fig-fallback">
            {fallback}
            <p className="caption">这台浏览器打不开三维（不支持 WebGL），这里换成同一份数据画的平面图。</p>
          </div>
        ) : active ? (
          <Gesture armed={armed}>{engine(() => setReady(true))}</Gesture>
        ) : (
          <div className="fig-idle">
            <button type="button" className="btn" onClick={() => usePresent.getState().setActive(id)}>
              载入三维
            </button>
            <p className="caption">滚动到这里会自动载入</p>
          </div>
        )}
        {WEBGL && active && !ready ? (
          <p className="fig-loading" role="status">
            正在构建模型
          </p>
        ) : null}
      </div>
      {tools || WEBGL ? (
        <div className="fig-tools">
          {tools}
          {WEBGL ? (
            <button type="button" className="btn arm" aria-pressed={armed} disabled={!active} title={active ? undefined : "三维载入后才能操作"} onClick={() => setArmed(!armed)}>
              {armed ? "完成，恢复滚动" : "操作三维"}
            </button>
          ) : null}
        </div>
      ) : null}
      <figcaption className="fig-cap">
        <span className="fig-no">图 {no}</span>
        <span className="fig-text">{caption}</span>
        <span className="fig-note">模型示意，非效果图 · {hint}</span>
      </figcaption>
      {after}
    </figure>
  );
}
