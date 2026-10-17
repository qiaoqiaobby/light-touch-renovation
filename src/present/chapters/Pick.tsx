import { SCHEMES, cropOf, schemeOf } from "../data";
import { DIMS } from "../content";
import { Palette } from "../board/parts";
import { PICK_MAX, PICK_MIN } from "../pick";
import { POOL } from "../pool";
import { NO_POINTS, usePresent, type Dim } from "../store";
import { Chapter } from "../ui";

const TOTAL = 10;

function Board() {
  const answers = usePresent((s) => s.answers);
  const set = usePresent((s) => s.setAnswers);
  const { picked, revealed } = answers;
  const full = picked.length >= PICK_MAX;
  // 读点击当下的状态，不用渲染时的闭包：连续快速点击时不会互相覆盖
  const toggle = (crop: string) => {
    const now = usePresent.getState().answers;
    if (now.revealed) return;
    if (now.picked.includes(crop)) set({ picked: now.picked.filter((c) => c !== crop) });
    else if (now.picked.length < PICK_MAX) set({ picked: [...now.picked, crop] });
  };
  return (
    <div className="pick-grid" role="group" aria-label="盲选拼贴">
      {POOL.map((t, i) => {
        const c = cropOf(t.crop);
        const order = picked.indexOf(t.crop);
        const on = order >= 0;
        const blocked = !on && full && !revealed;
        return (
          <button
            key={t.crop}
            type="button"
            className={`pick${revealed ? " shown" : ""}${revealed && !on ? " faded" : ""}`}
            aria-pressed={on}
            aria-label={`拼贴 ${i + 1}${revealed ? `，属于${schemeOf(t.scheme).name}` : ""}`}
            disabled={blocked || revealed}
            title={blocked ? `最多选 ${PICK_MAX} 块，先取消一块` : revealed ? "已经揭晓。要改，点下面的「重新挑选」" : undefined}
            onClick={() => toggle(t.crop)}
          >
            <img src={c.src} width={c.w} height={c.h} alt="" decoding="async" />
            {on ? <span className="pick-no tabular">{order + 1}</span> : null}
            {revealed ? <span className="pick-tag">{schemeOf(t.scheme).name}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function Reveal() {
  const answers = usePresent((s) => s.answers);
  const set = usePresent((s) => s.setAnswers);
  const { picked, revealed, sawStyles } = answers;
  const lack = PICK_MIN - picked.length;
  if (!revealed) {
    return (
      <div className="pick-bar">
        <p className="tabular">
          已选 <b>{picked.length}</b> / {PICK_MAX}
        </p>
        <button type="button" className="btn primary" disabled={lack > 0} onClick={() => set({ revealed: true })}>
          揭晓
        </button>
        <p className="reason">{lack > 0 ? `还差 ${lack} 块才能揭晓。` : picked.length < PICK_MAX ? `还能再选 ${PICK_MAX - picked.length} 块，也可以现在揭晓。` : "选满了。想换一块，先点它取消。"}</p>
        {picked.length ? (
          <button type="button" className="btn" onClick={() => set({ picked: [] })}>
            清空
          </button>
        ) : null}
      </div>
    );
  }
  const counts = SCHEMES.map((s) => ({ s, n: POOL.filter((t) => t.scheme === s.id && picked.includes(t.crop)).length }));
  const top = Math.max(...counts.map((c) => c.n));
  const leaders = counts.filter((c) => c.n === top).map((c) => c.s.name);
  return (
    <div className="reveal" aria-live="polite">
      <ol className="tally">
        {counts.map(({ s, n }) => (
          <li key={s.id} className={n === top ? "lead-col" : undefined}>
            <span className="tally-n tabular">{n}</span>
            <span className="tally-name">
              {s.name}
              {s.control ? <span className="caption">（对照）</span> : null}
            </span>
            <Palette s={s} compact />
          </li>
        ))}
      </ol>
      <p className="lead">
        你挑的 {picked.length} 块里，{leaders.join("和")}最多。
      </p>
      <p className="caption">
        这只是起点，不是结论：每套只放了 8 块进来，挑中的多少说明你被哪种材料和颜色吸引，不说明哪套方案更好。
        {sawStyles ? "你挑选之前已经看过第 5 章的方案，这次不完全算盲选，结果里会注明。" : ""}
      </p>
      <button type="button" className="btn" onClick={() => set({ picked: [], revealed: false, sawStyles: true })}>
        重新挑选
      </button>
    </div>
  );
}

function Points() {
  const points = usePresent((s) => s.answers.points);
  const set = usePresent((s) => s.setAnswers);
  const used = Object.values(points).reduce((a, b) => a + b, 0);
  const left = TOTAL - used;
  const bump = (id: Dim, d: number) => {
    const now = usePresent.getState().answers.points;
    const next = now[id] + d;
    const rest = Object.values(now).reduce((a, b) => a + b, 0) - now[id];
    if (next >= 0 && rest + next <= TOTAL) set({ points: { ...now, [id]: next } });
  };
  return (
    <section className="block" aria-labelledby="points-title">
      <h3 id="points-title">把 10 点分给 6 件事</h3>
      <p className="prose-p">越在意的给得越多，不在意的可以给 0。设计方会用它给具体的改动排先后：问题越严重、你越在意、花费越小的，越先做。</p>
      <ul className="points">
        {DIMS.map((d) => (
          <li key={d.id}>
            <span className="pt-name">
              <b>{d.name}</b>
              <span className="caption">{d.plain}</span>
            </span>
            <span className="pt-ctl">
              <button type="button" className="btn step" aria-label={`${d.name}减 1 点`} disabled={points[d.id] === 0} title={points[d.id] === 0 ? "已经是 0" : undefined} onClick={() => bump(d.id, -1)}>
                −
              </button>
              <span className="pt-val tabular" aria-live="polite">
                {points[d.id]}
              </span>
              <button type="button" className="btn step" aria-label={`${d.name}加 1 点`} disabled={left === 0} title={left === 0 ? "10 点已分完" : undefined} onClick={() => bump(d.id, 1)}>
                +
              </button>
            </span>
            <span className="pt-meter" aria-hidden="true">
              {Array.from({ length: TOTAL }, (_, k) => (
                <i key={k} className={k < points[d.id] ? "on" : undefined} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="pick-bar">
        <p className="tabular">{left ? `还剩 ${left} 点` : "10 点已分完"}</p>
        {used ? (
          <button type="button" className="btn" onClick={() => set({ points: { ...NO_POINTS } })}>
            重新分配
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function Pick() {
  return (
    <Chapter id="pick" no={3} title="先挑你喜欢的" lead={`先别看方案名。从下面 ${POOL.length} 块里挑 ${PICK_MIN} 到 ${PICK_MAX} 块你最喜欢的，挑完再揭晓它们各属于哪一套。`}>
      <p className="banner">风格参考拼贴，不是本屋效果图。这些是别人家照片里裁下的局部，只看材质、颜色和造型。四套方案各放了 8 块，顺序是打乱的。</p>
      <Board />
      <Reveal />
      <Points />
      <p className="caption">你的选择只存在这台电脑的浏览器里，第 8 章会把它们整理成一段文字，方便你发给设计方。</p>
    </Chapter>
  );
}
