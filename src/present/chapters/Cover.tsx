import { CEILING, ROOMS, SCHEMES, TOTAL_AREA, colouredRetained, roomOf } from "../data";
import { CHAPTERS, PRIVATE_NOTE } from "../content";
import { scrollToChapter } from "../ui";

export function Cover() {
  const hall = roomOf("L").main[0];
  const kept = SCHEMES.map((s) => {
    const coloured = colouredRetained(s.id);
    return { name: s.name, n: coloured.filter((r) => s.retained[r.id]?.keep).length, of: coloured.length };
  });
  const block: { k: string; v: string }[] = [
    { k: "项目", v: "住宅微改提案" },
    { k: "户型", v: `三室一厅一厨一卫，共 ${ROOMS.length} 间，上北下南` },
    { k: "复算面积", v: `${TOTAL_AREA.toFixed(1)} ㎡` },
    { k: "客厅主体", v: `${hall} mm` },
    { k: "层高", v: `${CEILING.toFixed(2)} m（假定，待复核）` },
    { k: "尺寸精度", v: "单个尺寸约 ±15 mm" },
    { k: "日期", v: __PRESENT_DATE__ },
    { k: "状态", v: "提案，等你挑选" },
  ];
  return (
    <section id="cover" className="cover" data-chapter="cover" aria-labelledby="cover-title">
      <h1 id="cover-title">住宅微改提案</h1>
      <p className="cover-lead">先把现在的家看清楚，再从最容易撤回的改动开始，只改到刚好够用为止。</p>
      <dl className="title-block">
        {block.map((b) => (
          <div key={b.k}>
            <dt>{b.k}</dt>
            <dd>{b.v}</dd>
          </div>
        ))}
      </dl>
      <div className="summary">
        <p>
          <b>客厅有三种摆法：减、分、空。</b>三种都按复尺后的客厅重新摆过，每种使用状态下都能从入户走到厨房和卫生间。
        </p>
        <p>
          <b>风格有四套：素木、木与钢、席地，加一套作对照的暖古典。</b>它们最大的区别不在家具，在现状装修要改多少。有颜色的现状硬装（蓝色护墙板、红棕木柜、厨房蓝柜）原样保留的项数：
          {kept.map((k, i) => (
            <span key={k.name} className="tabular">
              {i ? "，" : ""}
              {k.name} {k.n} / {k.of}
            </span>
          ))}
          。
        </p>
        <p>
          <b>建议先挑你喜欢的拼贴，再看方案。</b>方向定下来以后，先做不花钱的整理和买得到的成品，试住一两周，再决定要不要刷漆、做柜子。
        </p>
      </div>
      <div className="cta">
        <button type="button" className="btn primary" onClick={() => scrollToChapter("pick")}>
          先去第 3 章，挑你喜欢的
        </button>
        <span className="caption">挑完再看方案，选择不受方案名影响。</span>
      </div>
      <nav className="toc" aria-label="目录">
        <h2 className="toc-title">目录</h2>
        <ol>
          {CHAPTERS.filter((c) => c.id !== "cover").map((c) => (
            <li key={c.id}>
              <button type="button" className="toc-link" onClick={() => scrollToChapter(c.id)}>
                <span className="toc-no tabular">{c.no ?? "—"}</span>
                <span>{c.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <p className="caption private">{PRIVATE_NOTE}</p>
    </section>
  );
}
