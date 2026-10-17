/** 拼贴、色板、改动清单、现状硬装表。移植自 boards/src/main.js，去掉了色差数值和内部来源。 */
import { FACTS, LEVELS, RETAINED, cropOf, levelCounts, type BChange, type BScheme, type BoardRoomId } from "../data";
import { Lv } from "../ui";
import { numbering } from "./style";

export function Tiles({ s, roomId, hot, onHot }: { s: BScheme; roomId: BoardRoomId; hot: string | null; onHot: (id: string | null) => void }) {
  const nums = numbering(s, roomId);
  return (
    <div className="board">
      {(s.rooms[roomId]?.tiles ?? []).map((t, i) => {
        const c = cropOf(t.crop);
        const n = t.piece ? nums.get(t.piece) : undefined;
        const base = t.crop.startsWith("base-");
        const on = Boolean(hot && t.piece === hot);
        const enter = () => onHot(t.piece ?? null);
        return (
          <figure key={`${t.crop}-${i}`} className={`tile${on ? " on" : ""}`} tabIndex={0} onMouseEnter={enter} onMouseLeave={() => onHot(null)} onFocus={enter} onBlur={() => onHot(null)}>
            <img src={c.src} width={c.w} height={c.h} alt={`${c.name}：${t.take}`} decoding="async" />
            <figcaption>
              <span className={`badge${n ? "" : " soft"}`}>{n ?? t.use}</span>
              <b>{base ? `现状：${c.name}` : c.name}</b>
              <span className="take">取：{t.take}</span>
              <span className="src">{base ? "取自全景照片" : `参考图 ${c.img}`}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function Swatch({ name, hex, sub }: { name: string; hex?: string; sub?: string }) {
  return (
    <li className="sw">
      <i style={{ background: hex }} aria-hidden="true" />
      <span>{name}</span>
      <small>{sub ?? hex}</small>
    </li>
  );
}

export function Palette({ s, compact = false }: { s: BScheme; compact?: boolean }) {
  const f = FACTS.schemes[s.id].retained;
  const kept = RETAINED.filter((r) => s.retained[r.id]?.keep && !f[r.id].neutral);
  if (compact) {
    return (
      <ul className="sw-row" aria-label={`${s.name}色板`}>
        {[...s.palette.main, ...s.palette.accent].map((c) => (
          <li key={c.name} title={c.name}>
            <i style={{ background: c.hex }} aria-hidden="true" />
            <span>{c.name}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="palette">
      <div className="pgroup">
        <span className="caption">主色 {s.palette.main.length}</span>
        <ul>
          {s.palette.main.map((c) => (
            <Swatch key={c.name} name={c.name} hex={c.hex} />
          ))}
        </ul>
      </div>
      <div className="pgroup">
        <span className="caption">点缀 {s.palette.accent.length}</span>
        <ul>
          {s.palette.accent.map((c) => (
            <Swatch key={c.name} name={c.name} hex={c.hex} />
          ))}
        </ul>
      </div>
      {kept.length ? (
        <div className="pgroup">
          <span className="caption">原样保留的有色硬装</span>
          <ul>
            {kept.map((r) => (
              <li key={r.id} className="sw">
                <img src={cropOf(r.swatch).src} alt="" />
                <span>{r.name}</span>
                <small>现状</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="pgroup">
        <span className="caption">不计入主色</span>
        <p className="caption">白、灰、黑等中性色；地砖、白墙、吊顶、卧室白柜和地板都属于这一类</p>
      </div>
    </div>
  );
}

export function MixBar({ s }: { s: BScheme }) {
  const total = s.mix.reduce((a, [, v]) => a + v, 0);
  return (
    <div className="mix">
      <div className="mix-bar" role="img" aria-label={s.mix.map(([k, v]) => `${k} ${v}%`).join("，")}>
        {s.mix.map(([k, v]) => (
          <span key={k} style={{ width: `${(v / total) * 100}%` }} />
        ))}
      </div>
      <div className="mix-legend">
        {s.mix.map(([k, v]) => (
          <span key={k}>
            {k} {v}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function Changes({ list, current }: { list: (BChange & { room?: string })[]; current?: string }) {
  if (!list.length) return <p className="caption">这一阶段这里没有改动。</p>;
  return (
    <div className="wrap-x">
      <table className="tbl">
        <thead>
          <tr>
            <th>层级</th>
            <th>改动</th>
            <th>可逆性</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => (
            <tr key={`${c.text}-${i}`} className={current && c.level !== current ? "dim-row" : undefined}>
              <td>
                <Lv level={c.level} />
              </td>
              <td>
                {c.room ? <span className="caption room-tag">{c.room}</span> : null}
                {c.room ? " " : null}
                {c.text}
              </td>
              <td className="nowrap">{c.rev}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RetainedTable({ s }: { s: BScheme }) {
  const f = FACTS.schemes[s.id].retained;
  return (
    <div className="wrap-x">
      <table className="tbl">
        <thead>
          <tr>
            <th>现状硬装</th>
            <th>本方案</th>
            <th>和方案色板的关系</th>
          </tr>
        </thead>
        <tbody>
          {RETAINED.map((r) => {
            const d = s.retained[r.id];
            const x = f[r.id];
            const rel = x.neutral ? "中性色，任何方案都能留" : x.fits ? `接近「${x.near}」，可以原样保留` : "和本方案的色板差得远";
            return (
              <tr key={r.id}>
                <td>
                  <span className="swatch-cell">
                    <img src={cropOf(r.swatch).src} alt="" />
                    {r.name}
                  </span>
                </td>
                <td>
                  {d.keep ? (
                    <span>
                      <Lv level="L0" /> 保留{d.note ? `（${d.note}）` : ""}
                    </span>
                  ) : (
                    <span>
                      <Lv level={d.level!} /> {d.text}
                    </span>
                  )}
                </td>
                <td className="caption">{rel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LevelCounts({ s }: { s: BScheme }) {
  const n = levelCounts(s);
  return (
    <span className="counts">
      {LEVELS.map((l) => (
        <span key={l.id}>
          <Lv level={l.id} /> {n[l.id]}
        </span>
      ))}
    </span>
  );
}
