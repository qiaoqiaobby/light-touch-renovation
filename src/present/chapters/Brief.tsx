import { BRIEF } from "../content";
import { Chapter } from "../ui";

export function Brief() {
  return (
    <Chapter id="brief" no={1} title="你的需求" lead="这份提案按你说的生活方式来排先后，而不是按房子本身。下面是 2026-09-30 和你确认过的内容。">
      <dl className="facts-table">
        {BRIEF.map((b) => (
          <div key={b.k}>
            <dt>{b.k}</dt>
            <dd>
              {b.v}
              {b.state ? <span className="state">{b.state}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </Chapter>
  );
}
