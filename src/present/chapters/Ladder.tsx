import { LEVELS, SCHEMES } from "../data";
import { LADDER_STEPS } from "../content";
import { Chapter, Lv } from "../ui";

/** 各方案里列为「需专业人员评估」的 L4 选项，去重。 */
const L4 = [...new Set(SCHEMES.flatMap((s) => Object.values(s.rooms).flatMap((r) => r.changes.filter((c) => c.level === "L4").map((c) => c.text))))];

export function Ladder() {
  return (
    <Chapter id="ladder" no={7} title="怎么落地" lead="沿着一条阶梯往上走：先做容易撤回的，试住一两周，问题还在再往上一层，走到刚好够用就停。">
      <div className="wrap-x">
        <table className="tbl ladder">
          <thead>
            <tr>
              <th>层级</th>
              <th>做什么</th>
              <th>花费</th>
              <th>能不能撤回</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.id}>
                <td className="nowrap">
                  <Lv level={l.id} /> {l.name}
                </td>
                <td>{l.plain}</td>
                <td className="nowrap" data-label="花费">
                  {l.cost}
                </td>
                <td className="nowrap">
                  {l.rev}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="steps">
        {LADDER_STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="step-no tabular">{i + 1}</span>
            <div>
              <h3 className="h4">{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="block" aria-labelledby="l4-title">
        <h3 id="l4-title" className="sub">
          需要专业人员评估的选项
        </h3>
        <p className="prose-p">这些改动要动结构或水电，不算在任何一套方案里，只列出来供你知道有这条路。真想做，先请专业人员看现场，并确认物业的规定。</p>
        <ul className="plain-list">
          {L4.map((t) => (
            <li key={t}>
              <Lv level="L4" /> {t}
            </li>
          ))}
        </ul>
      </section>
    </Chapter>
  );
}
