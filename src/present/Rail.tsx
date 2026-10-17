import { useState } from "react";
import { CHAPTERS } from "./content";
import { usePresent } from "./store";
import { scrollToChapter } from "./ui";

/** 章节栏：宽屏固定在左侧；窄屏收成顶部条，点「目录」展开。 */
export function Rail({ ids }: { ids: string[] }) {
  const current = usePresent((s) => s.chapter);
  const [open, setOpen] = useState(false);
  const list = CHAPTERS.filter((c) => ids.includes(c.id));
  const cur = list.find((c) => c.id === current) ?? list[0];
  return (
    <nav className="rail" aria-label="章节" data-open={open}>
      <div className="rail-head">
        <p className="rail-title">住宅微改提案</p>
        <p className="rail-cur" aria-hidden="true">
          {cur.no ? `第 ${cur.no} 章 · ` : ""}
          {cur.short}
        </p>
        <button type="button" className="btn rail-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "收起" : "目录"}
        </button>
      </div>
      <ol className="rail-list">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="rail-link"
              aria-current={current === c.id ? "true" : undefined}
              onClick={() => {
                setOpen(false);
                scrollToChapter(c.id);
              }}
            >
              <span className="rail-no tabular">{c.no ?? ""}</span>
              <span className="rail-name">{c.short}</span>
              {c.id === "pick" ? <span className="rail-hint">建议先做</span> : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
