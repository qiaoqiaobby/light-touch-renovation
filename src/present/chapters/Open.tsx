import { useRef, useState } from "react";
import { OPEN_ITEMS } from "../content";
import { resultText } from "../results";
import { usePresent } from "../store";
import { Chapter } from "../ui";

function Result() {
  const answers = usePresent((s) => s.answers);
  const text = resultText(answers);
  const area = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<"" | "ok" | "fail">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("ok");
    } catch {
      area.current?.select();
      setStatus("fail");
    }
  };
  return (
    <section className="block" aria-labelledby="result-title">
      <h3 id="result-title" className="sub">
        发给设计方
      </h3>
      <p className="prose-p">下面这段文字是你在第 3、4 章和上面填的内容，复制下来，用微信或邮件发给设计方就行。</p>
      <textarea ref={area} className="result" readOnly value={text} rows={text.split("\n").length + 1} aria-label="整理好的选择" onFocus={(e) => e.currentTarget.select()} />
      <div className="pick-bar">
        <button type="button" className="btn primary" onClick={copy}>
          复制
        </button>
        <p className="reason" role="status">
          {status === "ok" ? "已复制。" : status === "fail" ? "这个浏览器不让网页直接写剪贴板，文字已经选中，按 Ctrl + C 或 ⌘ + C 复制。" : ""}
        </p>
      </div>
    </section>
  );
}

export function Open() {
  const note = usePresent((s) => s.answers.note);
  const set = usePresent((s) => s.setAnswers);
  return (
    <Chapter id="open" no={8} title="还没定的事" lead="下面这些定下来之前，方案只能停在可以撤回的那几层。要你决定的，可以直接写在补充说明里。">
      <div className="open-groups">
        {OPEN_ITEMS.map((g) => (
          <section key={g.group} className="block" aria-label={g.group}>
            <h3 className="h4">{g.group}</h3>
            <ul className="open-list">
              {g.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="block" aria-labelledby="note-title">
        <h3 id="note-title" className="sub">
          补充说明
        </h3>
        <textarea
          className="note"
          rows={5}
          value={note}
          placeholder="比如：预算上限、打算住几年、哪块拼贴特别喜欢或特别不喜欢、房间分工要不要换……"
          aria-label="补充说明"
          onChange={(e) => set({ note: e.target.value })}
        />
      </section>
      <Result />
    </Chapter>
  );
}
