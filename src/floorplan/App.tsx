import { useEffect, useRef, useState } from "react";
import { DOORS, ROOMS } from "./plan-data";
import { planArea } from "./geometry";
import { SCENES, SCHEMES } from "./living-schemes";
import { usePlan, type SchemeMode, type ViewMode } from "./store";

const SCHEME_BUTTONS: { id: SchemeMode; label: string }[] = [
  { id: "show", label: "示意" },
  ...SCHEMES.map((s) => ({ id: s.id, label: s.label })),
];

const MODES: { id: ViewMode; label: string }[] = [
  { id: "orbit", label: "鸟瞰" },
  { id: "top", label: "俯视" },
  { id: "walk", label: "漫游" },
];

function Stick() {
  const setStick = usePlan((s) => s.setStick);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const apply = (clientX: number, clientY: number) => {
    if (!origin.current) return;
    const dx = clientX - origin.current.x;
    const dy = clientY - origin.current.y;
    const max = 46;
    const x = Math.max(-1, Math.min(1, dx / max));
    const y = Math.max(-1, Math.min(1, -dy / max));
    setStick({ x, y });
    setKnob({ x: x * max, y: -y * max });
  };
  return (
    <div
      className="relative h-28 w-28 touch-none rounded-full border border-muted/30 bg-sheet/90"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { x: e.clientX, y: e.clientY };
        apply(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => apply(e.clientX, e.clientY)}
      onPointerUp={() => {
        origin.current = null;
        setKnob({ x: 0, y: 0 });
        setStick({ x: 0, y: 0 });
      }}
      onPointerCancel={() => {
        origin.current = null;
        setKnob({ x: 0, y: 0 });
        setStick({ x: 0, y: 0 });
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 h-11 w-11 rounded-full bg-ink"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
      <span className="sr-only">移动摇杆，上为前进</span>
    </div>
  );
}

export function Hud() {
  const mode = usePlan((s) => s.mode);
  const section = usePlan((s) => s.section);
  const furniture = usePlan((s) => s.furniture);
  const labels = usePlan((s) => s.labels);
  const night = usePlan((s) => s.night);
  const hour = usePlan((s) => s.hour);
  const selected = usePlan((s) => s.selected);
  const doors = usePlan((s) => s.doors);
  const scheme = usePlan((s) => s.scheme);
  const scene = usePlan((s) => s.scene);
  const schemeNote =
    scheme === "show"
      ? "示意家具只说明放得下。减、分、空来自客厅三方案，已按净尺寸核算的 3364 × 5738 主体重摆。"
      : SCHEMES.find((s) => s.id === scheme)?.note;
  const [locked, setLocked] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const room = ROOMS.find((r) => r.id === selected) ?? null;

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    const onLock = () => setLocked(document.pointerLockElement != null);
    document.addEventListener("pointerlockchange", onLock);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const plan = usePlan.getState();
      if (e.code === "Escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        else if (plan.mode === "walk") plan.setMode("orbit");
        return;
      }
      const idx = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].indexOf(e.code);
      if (idx >= 0) {
        plan.focusRoom(ROOMS[idx].id);
        return;
      }
      if (e.code === "KeyF") plan.focusRoom("all");
      if (e.code === "KeyT") plan.setMode(plan.mode === "walk" ? "orbit" : "walk");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const total = ROOMS.reduce((sum, r) => sum + planArea(r.id), 0);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-3 sm:p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto max-w-xl">
          <p className="text-xs tracking-widest text-muted">净尺寸 · 三室一厅 · 上北下南</p>
          <h1 className="font-display text-3xl leading-none font-semibold sm:text-4xl">户型三维</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            按复尺的内墙轮廓建的模型。拖动旋转，双击房间飞近，点门可以开关。
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`h-11 rounded-sm px-3 text-sm ${mode === m.id ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
              onClick={() => usePlan.getState().setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-3 flex max-w-3xl flex-wrap items-center gap-2">
        {SCHEME_BUTTONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${scheme === s.id ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
            onClick={() => usePlan.getState().setScheme(s.id)}
          >
            {s.label}
          </button>
        ))}
        {scheme !== "show"
          ? SCENES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${scene === s.id ? "bg-dim text-sheet" : "bg-sheet text-ink"}`}
                onClick={() => usePlan.getState().setScene(s.id)}
              >
                {s.label}
              </button>
            ))
          : null}
        <p className="pointer-events-none basis-full text-sm text-muted">{schemeNote}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:mr-80">
        <button
          type="button"
          className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${!section ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
          onClick={() => usePlan.getState().toggleSection()}
        >
          {section ? "剖切墙" : "全高墙"}
        </button>
        <button
          type="button"
          className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${furniture ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
          onClick={() => usePlan.getState().toggleFurniture()}
        >
          家具
        </button>
        <button
          type="button"
          className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${labels ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
          onClick={() => usePlan.getState().toggleLabels()}
        >
          标注
        </button>
        <button
          type="button"
          className={`pointer-events-auto h-11 rounded-sm px-3 text-sm ${night ? "bg-ink text-sheet" : "bg-sheet text-ink"}`}
          onClick={() => usePlan.getState().toggleNight()}
        >
          {night ? "夜景" : "日光"}
        </button>
        <label className="pointer-events-auto flex h-11 items-center gap-2 rounded-sm bg-sheet px-3 text-sm text-muted">
          <span className="tabular">{String(Math.floor(hour)).padStart(2, "0")}:00</span>
          <input
            className="w-24 accent-dim"
            type="range"
            min={6}
            max={18}
            step={0.5}
            value={hour}
            aria-label="日照时间"
            onChange={(e) => usePlan.getState().setHour(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="min-h-4 flex-1" />

      {mode === "walk" && !locked && !coarse ? (
        <p className="pointer-events-none mb-3 self-center text-center text-sm text-ink">
          点击画面锁定鼠标 · WASD 移动 · E 开关门 · Esc 退出
        </p>
      ) : null}

      {mode === "walk" ? (
        <div className="pointer-events-auto absolute bottom-4 left-4">
          <Stick />
        </div>
      ) : null}

      <aside
        className={`pointer-events-auto absolute inset-x-3 bottom-3 max-h-[42dvh] overflow-auto rounded-sm border border-muted/25 bg-sheet/95 p-3 sm:inset-x-auto sm:top-36 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-80 ${mode === "walk" ? "hidden" : ""}`}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {DOORS.map((d) => {
            const open = (doors[d.id] ?? 0) > 0.5;
            return (
              <button
                key={d.id}
                type="button"
                className={`h-9 rounded-sm px-2 text-xs ${open ? "bg-ink text-sheet" : "bg-paper text-ink"}`}
                onClick={() => usePlan.getState().toggleDoor(d.id)}
              >
                {d.id} {d.name} {open ? "开" : "关"}
              </button>
            );
          })}
        </div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">房间</h2>
            <span className="text-xs text-muted tabular">复算 {total.toFixed(1)} ㎡</span>
          </div>
          <ul className="grid gap-2">
            {ROOMS.map((r, i) => {
              const on = r.id === selected;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`w-full rounded-sm border px-3 py-2 text-left ${on ? "border-dim bg-dim/10" : "border-muted/20"}`}
                    onClick={() => usePlan.getState().focusRoom(r.id)}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-base font-semibold">{r.name}</span>
                      <span className="text-xs text-muted tabular">
                        {i + 1} · {r.label} ㎡
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-dim tabular">{r.main[0]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {room ? (
            <div className="mt-3 grid gap-2 border-t border-muted/20 pt-3 text-sm">
              <p className="text-muted">{room.main[1]}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {room.facts.map((f) => (
                  <div key={f.k} className="contents">
                    <dt className="text-muted">{f.k}</dt>
                    <dd className="tabular">
                      {f.v}
                      {f.exact ? <span className="ml-2 text-xs text-muted">原值</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>{room.tip}</p>
            </div>
          ) : (
            <p className="mt-3 border-t border-muted/20 pt-3 text-sm text-muted">
              层高图上没有，这里按 2.70 m。窗台按常见住宅假定。单个尺寸大约 ±15 mm。平开门洞宽不宜直接拿去订门。
            </p>
          )}
      </aside>
    </div>
  );
}
