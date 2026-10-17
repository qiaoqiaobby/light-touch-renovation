/** 交付页的基础控件。状态定义见 DESIGN.md 第 10.5 节。 */
import type { ReactNode } from "react";
import { levelOf, type Level } from "./data";

export type SegOption<T extends string> = { id: T; label: string; disabled?: string };

/** 分段按钮。disabled 必须带原因：title 给指针用户，原因文字由调用处另外显示。 */
export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: SegOption<T>[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} disabled={Boolean(o.disabled)} title={o.disabled} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 一组工具：左边一个小标签，右边一组分段按钮。 */
export function Tool({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="tool">
      <span className="tool-name">{name}</span>
      {children}
    </div>
  );
}

export function Lv({ level, named = false }: { level: Level; named?: boolean }) {
  return (
    <span className={`lv ${level}`} title={`${level} ${levelOf(level).name}`}>
      {named ? `${level} ${levelOf(level).name}` : level}
    </span>
  );
}

export function Chapter({ id, no, title, lead, children }: { id: string; no?: number; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="chapter" aria-labelledby={`${id}-title`} data-chapter={id}>
      <header className="ch-head">
        {no ? <p className="ch-no">第 {no} 章</p> : null}
        <h2 id={`${id}-title`}>{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function scrollToChapter(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
