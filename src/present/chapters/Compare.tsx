import type { ReactNode } from "react";
import { ROOMS, SCHEMES, colouredRetained, levelOf, maxStageOf, type BScheme } from "../data";
import { LevelCounts, MixBar, Palette } from "../board/parts";
import { Plan, bbox } from "../board/Plan";
import { stylePieces } from "../board/style";
import { usePresent } from "../store";
import { Chapter, scrollToChapter } from "../ui";

const VIEW = bbox(
  ROOMS.map((r) => r.poly),
  300,
);

const ROWS: { k: string; v: (s: BScheme) => ReactNode }[] = [
  { k: "客厅布局", v: (s) => s.layoutName },
  { k: "风格配比", v: (s) => <MixBar s={s} /> },
  { k: "颜色", v: (s) => (
      <>
        <span className="tabular">
          主色 {s.palette.main.length} + 点缀 {s.palette.accent.length}
        </span>
        <Palette s={s} compact />
      </>
    ) },
  {
    k: "有色硬装原样保留",
    v: (s) => {
      const c = colouredRetained(s.id);
      const kept = c.filter((r) => s.retained[r.id]?.keep);
      return (
        <>
          <span className="tabular">
            {kept.length} / {c.length}
          </span>
          <span className="caption block-line">{kept.length ? kept.map((r) => r.name).join("、") : "全部刷掉或贴膜"}</span>
        </>
      );
    },
  },
  { k: "最高层级", v: (s) => `${maxStageOf(s.id)} ${levelOf(maxStageOf(s.id)).name}` },
  { k: "改动条数（不代表花费）", v: (s) => <LevelCounts s={s} /> },
  { k: "代价", v: (s) => s.cost },
  { k: "全屋平面", v: (s) => <Plan rooms={ROOMS} view={VIEW} pieces={stylePieces(s, "house", "daily")} label={`${s.name}全屋平面`} mini /> },
];

/** 导语里的对比由数据算出：有色硬装原样保留最少和最多的两套。 */
function leadText() {
  const kept = SCHEMES.map((s) => {
    const c = colouredRetained(s.id);
    return { s, n: c.filter((r) => s.retained[r.id]?.keep).length, of: c.length };
  }).sort((a, b) => a.n - b.n);
  const lo = kept[0];
  const hi = kept[kept.length - 1];
  return `选风格，同时也是在选现状装修要改多少：${lo.s.name}原样保留的有色硬装是 ${lo.n}\u00a0/\u00a0${lo.of}，${hi.s.name}是 ${hi.n}\u00a0/\u00a0${hi.of}。`;
}

export function Compare() {
  const setStyle = usePresent((st) => st.setStyle);
  return (
    <Chapter id="compare" no={6} title="并排比较" lead={leadText()}>
      <div className="wrap-x">
        <table className="tbl compare">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">项目</span>
              </th>
              {SCHEMES.map((s) => (
                <th key={s.id} scope="col" className="cmp-head">
                  <span className="cmp-name">{s.name}</span>
                  {s.control ? <span className="caption">对照方案</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.k}>
                <th scope="row">{row.k}</th>
                {SCHEMES.map((s) => (
                  <td key={s.id}>{row.v(s)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">
                <span className="sr-only">查看</span>
              </th>
              {SCHEMES.map((s) => (
                <td key={s.id}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setStyle({ scheme: s.id });
                      scrollToChapter("styles");
                    }}
                  >
                    看{s.name}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Chapter>
  );
}
