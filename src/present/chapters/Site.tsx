import { COPY } from "../../decor/copy";
import type { DecorView } from "../../decor/store";
import { BOARD_ROOMS, RETAINED, ROOMS, cropOf, planArea } from "../data";
import { SITE_RULES } from "../content";
import { DecorEngine } from "../figures/engines";
import { Figure } from "../figures/Figure";
import { HousePlan } from "../figures/fallbacks";
import { usePresent } from "../store";
import { Chapter, Seg, Tool } from "../ui";

export const VIEW_OPTIONS: { id: DecorView; label: string }[] = [
  { id: "orbit", label: "鸟瞰" },
  { id: "L-entry", label: "客厅 · 入户看" },
  { id: "L-hall", label: "客厅 · 过道看" },
  { id: "E", label: "玄关" },
  { id: "A", label: "卧室 A" },
  { id: "B", label: "卧室 B" },
  { id: "C", label: "卧室 C" },
  { id: "K", label: "厨房" },
  { id: "Bath", label: "卫生间" },
];
export const viewName = (v: DecorView) => VIEW_OPTIONS.find((o) => o.id === v)?.label ?? v;
export const LIGHT_OPTIONS = [
  { id: "day" as const, label: COPY.light.day },
  { id: "night" as const, label: COPY.light.night },
];

const ROLE: Record<string, string> = Object.fromEntries(BOARD_ROOMS.filter((r) => r.role).map((r) => [r.id, r.role!]));

export function Site() {
  const fig = usePresent((s) => s.site);
  const set = usePresent((s) => s.setSite);
  return (
    <Chapter id="site" no={2} title="房子现在的样子" lead="看现状只认硬装：地面、墙、门窗、固定柜和插座。上一任住户留下的家具和杂物都不算。">
      <Figure
        id="site"
        no="2-1"
        caption={`现状 · ${viewName(fig.view)} · ${fig.light === "day" ? "白天" : "夜晚"} · 活动家具已清空，冰箱、餐边柜、鞋柜按示意位置`}
        hint={fig.view === "orbit" ? "拖动旋转，按住 Ctrl 或 ⌘ 再滚轮缩放" : "拖动转动视角"}
        fallback={<HousePlan />}
        tools={
          <>
            <Tool name="视点">
              <Seg label="视点" value={fig.view} options={VIEW_OPTIONS} onChange={(view) => set({ view })} />
            </Tool>
            <Tool name="光线">
              <Seg label="光线" value={fig.light} options={LIGHT_OPTIONS} onChange={(light) => set({ light })} />
            </Tool>
          </>
        }
        engine={(onReady) => <DecorEngine fig={{ scheme: "S1", stage: "L0", view: fig.view, light: fig.light, scene: "daily" }} onReady={onReady} />}
      />

      <div className="cols">
        <section className="block" aria-labelledby="site-rooms">
          <h3 id="site-rooms">房间与尺寸</h3>
          <div className="wrap-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>房间</th>
                  <th>主体净尺寸（mm）</th>
                  <th>面积（标注 / 复算）</th>
                </tr>
              </thead>
              <tbody>
                {ROOMS.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      {ROLE[r.id] ? <span className="caption block-line">{ROLE[r.id]}</span> : null}
                    </td>
                    <td className="tabular">
                      {r.main[0]}
                      <span className="caption block-line">{r.main[1]}</span>
                    </td>
                    <td className="tabular nowrap">
                      {r.label} / {planArea(r.id).toFixed(1)} ㎡
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption">卧室的用途是假设，待你确认。</p>
        </section>

        <section className="block" aria-labelledby="site-finish">
          <h3 id="site-finish">现状硬装</h3>
          <ul className="finish">
            {RETAINED.map((r) => (
              <li key={r.id}>
                <img src={cropOf(r.swatch).src} alt="" />
                <span>{r.name}</span>
                {r.note ? <small>{r.note}</small> : null}
              </li>
            ))}
          </ul>
          <p className="caption">色块取自全景照片，颜色偏冷，以现场为准。蓝色护墙板、红棕木柜和厨房蓝柜是有颜色的三项，每套风格都要对它们表态：留，还是刷掉、贴膜。</p>
        </section>
      </div>

      <dl className="facts-table">
        {SITE_RULES.map((b) => (
          <div key={b.k}>
            <dt>{b.k}</dt>
            <dd>{b.v}</dd>
          </div>
        ))}
      </dl>
    </Chapter>
  );
}
