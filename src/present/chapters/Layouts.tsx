import { seats, spans } from "../../floorplan/scheme-metrics";
import { BOARD_ROOMS, LAYOUTS, LAYOUT_NAMES, SCENES, fmt, layoutPieces, roomOf, sceneLabel, type LayoutId, type Scene } from "../data";
import { LAYOUT_CHECKS, LAYOUT_COPY } from "../content";
import { Plan, type PlanDim } from "../board/Plan";
import { PlanEngine } from "../figures/engines";
import { Figure } from "../figures/Figure";
import { LayoutFallback } from "../figures/fallbacks";
import { usePresent, type LayoutPref } from "../store";
import { Chapter, Seg, Tool } from "../ui";

const SPANS = spans();
const VIEW = BOARD_ROOMS.find((r) => r.id === "L")!.view!;
const HALL_ROOM = roomOf("L");
/** 16:9 画面：宽 = 对角线 × 0.8716。1 英寸 25.4 mm。 */
const MM_PER_INCH_WIDTH = 25.4 * 0.8716;

/** 观影时的画面：幕布或墙面投影的宽度，按 16:9 折算成英寸。 */
function screenOf(id: LayoutId) {
  const p = layoutPieces(id, "movie").find((x) => x.id === "screen");
  if (!p) return null;
  const width = Math.max(p.w, p.d);
  return { inch: Math.round(width / MM_PER_INCH_WIDTH), width, wall: p.name.includes("墙面") };
}

const ORDER: LayoutId[] = ["s1", "s2", "s3"];

function LayoutCol({ id, scene }: { id: LayoutId; scene: Scene }) {
  const pieces = layoutPieces(id, scene).map((p) => ({ id: p.id, name: p.name, x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, mount: p.mount, soft: Boolean(p.cover || p.type === "rug") }));
  const own = SPANS.filter((s) => s.scheme === id);
  const dims: PlanDim[] = own.filter((s) => s.scene === scene).map((s) => ({ a: s.a, b: s.b, text: `${s.label} ${fmt(s.value)}` }));
  const scr = screenOf(id);
  const index = ORDER.indexOf(id);
  return (
    <article className="layout-col" aria-labelledby={`lay-${id}`}>
      <h3 id={`lay-${id}`} className="sub">
        {LAYOUT_NAMES[id].short}
        <span className="caption">{LAYOUT_NAMES[id].full.split("：")[1]}</span>
      </h3>
      <Plan rooms={[HALL_ROOM]} view={VIEW} pieces={pieces} dims={dims} label={`客厅平面，${LAYOUT_NAMES[id].short}，${sceneLabel(scene)}`} />
      <dl className="keys">
        {own.map((s) => (
          <div key={s.id}>
            <dt>{s.label}</dt>
            <dd className="tabular">
              {fmt(s.value)}
              <span className="caption">（{sceneLabel(s.scene)}时）</span>
            </dd>
          </div>
        ))}
        {scr ? (
          <div>
            <dt>{scr.wall ? "墙面投影" : "幕布"}</dt>
            <dd className="tabular">
              约 {scr.inch} 寸<span className="caption">（画面宽约 {fmt(scr.width)}）</span>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>聚会座位</dt>
          <dd className="tabular">{seats(index, "party")} 座</dd>
        </div>
      </dl>
      <p className="prose-p">{LAYOUT_COPY[id].what}</p>
      <p className="cost">
        <span className="caption">代价</span>
        {LAYOUT_COPY[id].cost}
      </p>
    </article>
  );
}

export function Layouts() {
  const scene = usePresent((s) => s.layoutScene);
  const setScene = usePresent((s) => s.setLayoutScene);
  const fig = usePresent((s) => s.layout);
  const setFig = usePresent((s) => s.setLayout);
  const pref = usePresent((s) => s.answers.layoutPref);
  const setAnswers = usePresent((s) => s.setAnswers);
  const prefOptions: { id: LayoutPref; label: string }[] = [...ORDER.map((id) => ({ id: id as LayoutPref, label: LAYOUT_NAMES[id].short })), { id: "any", label: "都可以" }];
  return (
    <Chapter
      id="layouts"
      no={4}
      title="客厅怎么摆"
      lead={`三种摆法：减、分、空。都按复尺后的客厅（主体 ${HALL_ROOM.main[0]} mm）重新摆过，家具尺寸没有缩小。`}
    >
      <div className="tools-row">
        <Tool name="场景">
          <Seg label="客厅使用场景" value={scene} options={SCENES.map((s) => ({ id: s.id, label: s.label }))} onChange={setScene} />
        </Tool>
      </div>
      <div className="layout-grid">
        {ORDER.map((id) => (
          <LayoutCol key={id} id={id} scene={scene} />
        ))}
      </div>
      <p className="fig-cap">
        <span className="fig-no">图 4-1</span>
        <span className="fig-text">客厅平面 · {sceneLabel(scene)} · 带端头的深色线是尺寸线，只在测量它的场景里画出；虚线是地毯，以及挂墙、吊顶的东西</span>
      </p>
      <p className="prose">{LAYOUT_CHECKS}</p>

      <Figure
        id="layout"
        no="4-2"
        caption={`客厅 · ${LAYOUT_NAMES[fig.scheme].short} · ${sceneLabel(scene)} · ${fig.mode === "top" ? "俯视" : "鸟瞰"} · 卧室不放家具`}
        hint="拖动旋转，按住 Ctrl 或 ⌘ 再滚轮缩放"
        fallback={<LayoutFallback scheme={fig.scheme} scene={scene} />}
        tools={
          <>
            <Tool name="方案">
              <Seg label="客厅方案" value={fig.scheme} options={LAYOUTS.map((l) => ({ id: l.id, label: LAYOUT_NAMES[l.id].short }))} onChange={(scheme) => setFig({ scheme })} />
            </Tool>
            <Tool name="视角">
              <Seg
                label="视角"
                value={fig.mode}
                options={[
                  { id: "orbit", label: "鸟瞰" },
                  { id: "top", label: "俯视" },
                ]}
                onChange={(mode) => setFig({ mode })}
              />
            </Tool>
          </>
        }
        engine={(onReady) => <PlanEngine fig={{ ...fig, scene }} onReady={onReady} />}
      />

      <section className="choose" aria-labelledby="pref-title">
        <h3 id="pref-title" className="sub">
          你更倾向哪一种？
        </h3>
        <Seg label="客厅布局倾向" value={pref} options={prefOptions} onChange={(layoutPref) => setAnswers({ layoutPref })} />
        <p className="caption">下一章的四套风格各自带着一种布局。如果你想要别的组合，比如素木配分，告诉设计方，那需要另做一遍摆放检查。</p>
      </section>
    </Chapter>
  );
}
