import { useEffect } from "react";
import { SCENES } from "../floorplan/living-schemes";
import { RETAINED } from "../../boards/data/house.mjs";
import { COPY } from "./copy";
import { BOARDS } from "./scene-data";
import { stageDown, stageUp, useDecor, type DecorView } from "./store";
import { STAGE_RANK, type RoomId, type SchemeId, type Stage } from "./types";
import { VIEWS } from "./views";

const NAMES = Object.fromEntries((RETAINED as { id: string; name: string }[]).map((item) => [item.id, item.name]));
const SCHEME_IDS: SchemeId[] = ["S1", "S2", "S3", "S4"];
const STAGE_IDS: Stage[] = ["L0", "L1", "L2", "L3"];
const VIEW_IDS: DecorView[] = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath", "orbit", "walk"];

function Seg({
  pressed,
  disabled,
  title,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className="h-11 rounded px-3 text-sm text-ink hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dim disabled:cursor-not-allowed disabled:text-muted aria-pressed:bg-ink aria-pressed:text-sheet"
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function App() {
  const schemeId = useDecor((s) => s.scheme);
  const stage = useDecor((s) => s.stage);
  const view = useDecor((s) => s.view);
  const light = useDecor((s) => s.light);
  const scene = useDecor((s) => s.scene);
  const ao = useDecor((s) => s.ao);
  const ready = useDecor((s) => s.ready);
  const apply = useDecor((s) => s.apply);
  const scheme = BOARDS.find((item) => item.id === schemeId) ?? BOARDS[0];
  const panels = VIEWS.find((item) => item.id === view)?.panels ?? (["L"] as RoomId[]);
  const changes = panels.flatMap((room) =>
    (scheme.rooms[room]?.changes ?? []).filter((change) => STAGE_RANK[change.level as Stage] <= STAGE_RANK[stage]).map((change) => ({ ...change, room })),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const now = useDecor.getState();
      const index = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8"].indexOf(e.code);
      if (index >= 0) now.apply({ view: VIEW_IDS[index] });
      if (e.code === "KeyO") now.apply({ view: "orbit" });
      if (e.code === "KeyT") now.apply({ view: "walk" });
      if (e.code === "KeyN") now.apply({ light: now.light === "day" ? "night" : "day" });
      if (e.code === "BracketLeft") now.apply({ stage: stageDown(now.stage) });
      if (e.code === "BracketRight") now.apply({ stage: stageUp(now.stage, now.scheme) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const living = view === "L-entry" || view === "L-hall";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 text-ink sm:p-4">
      <header className="pointer-events-auto max-w-3xl">
        <h1 className="font-display text-2xl leading-tight font-semibold">{COPY.title}</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">{COPY.banner}</p>
        {ao ? null : <p className="mt-1 text-xs text-muted">{COPY.aoOff}</p>}
        {ready ? null : <p className="mt-1 text-xs text-muted">正在构建模型</p>}
      </header>
      <div className="pointer-events-auto flex max-w-full flex-wrap gap-1">
        {SCHEME_IDS.map((id) => (
          <Seg key={id} pressed={schemeId === id} onClick={() => apply({ scheme: id })}>
            {BOARDS.find((item) => item.id === id)?.name ?? id}
          </Seg>
        ))}
      </div>
      <div className="pointer-events-auto flex max-w-full flex-wrap gap-1">
        {STAGE_IDS.map((id) => {
          const disabled = id === "L3" && (schemeId === "S1" || schemeId === "S4");
          return (
            <Seg key={id} pressed={stage === id} disabled={disabled} title={disabled ? COPY.stageDisabled : undefined} onClick={() => apply({ stage: id })}>
              {COPY.stages[id]}
            </Seg>
          );
        })}
      </div>
      <div className="pointer-events-auto flex max-w-full flex-wrap gap-1">
        {VIEW_IDS.map((id) => (
          <Seg key={id} pressed={view === id} onClick={() => apply({ view: id })}>
            {COPY.views[id]}
          </Seg>
        ))}
      </div>
      <div className="pointer-events-auto flex max-w-full flex-wrap gap-1">
        <Seg pressed={light === "day"} onClick={() => apply({ light: "day" })}>
          {COPY.light.day}
        </Seg>
        <Seg pressed={light === "night"} onClick={() => apply({ light: "night" })}>
          {COPY.light.night}
        </Seg>
        {living
          ? SCENES.map((item) => (
            <Seg key={item.id} pressed={scene === item.id} onClick={() => apply({ scene: item.id })}>
              {item.label}
            </Seg>
          ))
          : null}
      </div>
      <aside className="pointer-events-auto mt-auto max-h-[40vh] w-full max-w-sm overflow-auto rounded border border-ink/10 bg-sheet/95 p-3 text-sm leading-relaxed sm:absolute sm:top-4 sm:right-4 sm:mt-0 sm:max-h-[calc(100%-2rem)]">
        {changes.map((change, i) => (
          <p key={`${change.room}-${i}`} className={change.level === stage ? "font-semibold" : "text-muted"}>
            {change.text}
          </p>
        ))}
        <p className="mt-3 text-xs text-muted">{COPY.softNote}</p>
        {Object.entries(scheme.retained).map(([id, rule]) => (
          <p key={id} className="text-xs text-muted">
            {NAMES[id] ?? id}：{rule.keep ? "保留" : rule.text}
          </p>
        ))}
      </aside>
    </div>
  );
}
