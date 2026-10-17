import { useState } from "react";
import { VIEWS } from "../../decor/views";
import { BOARD_ROOMS, FACTS, LEVELS, ROOMS, SCENES, SCHEMES, boardRoomOf, fmt, levelOf, maxStageOf, roomOf, schemeOf, sceneLabel, type BoardRoomId, type BScheme, type Level, type Stage } from "../data";
import { LevelCounts, MixBar, Palette, RetainedTable, Changes, Tiles } from "../board/parts";
import { Plan, bbox, type PlanDim } from "../board/Plan";
import { stylePieces } from "../board/style";
import { DecorEngine } from "../figures/engines";
import { Figure } from "../figures/Figure";
import { StyleFallback } from "../figures/fallbacks";
import { usePresent } from "../store";
import { Chapter, Seg, Tool } from "../ui";
import { LIGHT_OPTIONS, VIEW_OPTIONS, viewName } from "./Site";

const STAGES: Stage[] = ["L0", "L1", "L2", "L3"];
const RANK: Record<Level, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
const ROOM_NAME = Object.fromEntries(BOARD_ROOMS.map((r) => [r.id, r.name]));
const ALL_ROOMS = ["L", "E", "A", "B", "C", "K", "Bath"];

function Head({ s }: { s: BScheme }) {
  return (
    <header className="style-head">
      <div className="name-row">
        <h3 className="style-name">{s.name}</h3>
        <span className="chip">客厅布局：{s.layoutName}</span>
        {s.control ? <span className="chip strong">对照方案</span> : null}
      </div>
      <p className="lead">{s.claim}</p>
      <dl className="facts-table">
        <div>
          <dt>风格配比</dt>
          <dd>
            <MixBar s={s} />
          </dd>
        </div>
        <div>
          <dt>统一</dt>
          <dd>{s.shared}</dd>
        </div>
        <div>
          <dt>对比</dt>
          <dd>{s.contrast}</dd>
        </div>
        <div>
          <dt>不用</dt>
          <dd>{s.exclude.length ? s.exclude.join("、") : "无"}</dd>
        </div>
        <div>
          <dt>代价</dt>
          <dd>{s.cost}</dd>
        </div>
      </dl>
      <Palette s={s} />
    </header>
  );
}

function StyleFigure({ s }: { s: BScheme }) {
  const fig = usePresent((st) => st.style);
  const set = usePresent((st) => st.setStyle);
  const cap = maxStageOf(s.id);
  const living = fig.view === "L-entry" || fig.view === "L-hall";
  const panels = fig.view === "orbit" ? ALL_ROOMS : (VIEWS.find((v) => v.id === fig.view)?.panels ?? ["L"]);
  const changes = panels.flatMap((room) => (s.rooms[room]?.changes ?? []).filter((c) => RANK[c.level] <= RANK[fig.stage]).map((c) => ({ ...c, room: ROOM_NAME[room] })));
  const stageOptions = STAGES.map((id) => ({ id, label: `${id} ${levelOf(id).name}`, disabled: RANK[id] > RANK[cap] ? `本方案最高到 ${cap} ${levelOf(cap).name}` : undefined }));
  return (
    <Figure
      id="style"
      no="5-1"
      caption={`${s.name} · ${fig.stage} ${levelOf(fig.stage).name} · ${viewName(fig.view)}${living ? ` · ${sceneLabel(fig.scene)}` : ""} · ${fig.light === "day" ? "白天" : "夜晚"}`}
      hint={fig.view === "orbit" ? "拖动旋转，按住 Ctrl 或 ⌘ 再滚轮缩放" : "拖动转动视角"}
      fallback={<StyleFallback scheme={s.id} />}
      tools={
        <>
          <Tool name="阶段">
            <Seg label="实施阶段" value={fig.stage} options={stageOptions} onChange={(stage) => set({ stage })} />
            {cap !== "L3" ? <span className="reason">这一套没有定制柜，最高到 {cap}。</span> : null}
          </Tool>
          <Tool name="视点">
            <Seg label="视点" value={fig.view} options={VIEW_OPTIONS} onChange={(view) => set({ view })} />
            {s.id === "S3" && fig.stage === "L3" && fig.view === "L-entry" ? <span className="reason">这个机位离入户储物墙很近，画面几乎只有柜门；看客厅换「鸟瞰」。</span> : null}
          </Tool>
          <Tool name="光线">
            <Seg label="光线" value={fig.light} options={LIGHT_OPTIONS} onChange={(light) => set({ light })} />
          </Tool>
          {living ? (
            <Tool name="场景">
              <Seg label="客厅使用场景" value={fig.scene} options={SCENES.map((x) => ({ id: x.id, label: x.label }))} onChange={(scene) => set({ scene })} />
            </Tool>
          ) : null}
        </>
      }
      after={
        <section className="fig-after" aria-label="这一阶段的改动">
          <p className="caption">
            到 {fig.stage} 为止，{fig.view === "orbit" ? "全屋" : viewName(fig.view)}要做的改动。本阶段新增的是深色字，之前阶段的是浅色字。
          </p>
          <Changes list={changes} current={fig.stage} />
        </section>
      }
      engine={(onReady) => <DecorEngine fig={{ scheme: s.id, stage: fig.stage, view: fig.view, light: fig.light, scene: fig.scene }} onReady={onReady} />}
    />
  );
}

function roomPlanProps(s: BScheme, roomId: BoardRoomId, scene: Parameters<typeof stylePieces>[2]) {
  const br = boardRoomOf(roomId);
  const house = roomId === "house";
  const rooms = house ? ROOMS : [roomOf(br.plan!)];
  const view = br.view ?? bbox(
    rooms.map((r) => r.poly),
    house ? 300 : 420,
  );
  const dims: PlanDim[] = FACTS.schemes[s.id].dims
    .filter((g) => g.room === roomId)
    .map((g) => ({ a: [g.line[0], g.line[1]], b: [g.line[2], g.line[3]], text: `${g.text} ${fmt(g.value)}` }));
  const labels = house
    ? BOARD_ROOMS.filter((r) => r.plan && r.id !== "E").map((r2) => {
        const r = roomOf(r2.plan!);
        const [x0, y0, x1, y1] = bbox([r.poly], 0);
        return { x: (x0 + x1) / 2, y: r2.plan === "L" ? y0 + 900 : (y0 + y1) / 2, text: r2.name };
      })
    : [];
  return { rooms, view, dims, labels, pieces: stylePieces(s, roomId, scene) };
}

function Legend() {
  return (
    <p className="legend caption">
      <span className="lg-new">新增（颜色取自方案色板）</span>
      <span className="lg-fixed">现状保留</span>
      <span className="lg-soft">地毯、挂墙、吊顶</span>
    </p>
  );
}

function Board({ s }: { s: BScheme }) {
  const room = usePresent((st) => st.style.room);
  const scene = usePresent((st) => st.style.scene);
  const set = usePresent((st) => st.setStyle);
  const [hot, setHot] = useState<string | null>(null);
  const br = boardRoomOf(room);
  const plan = roomPlanProps(s, room, scene);
  const notes: string[] = [];
  if (room === "K" || room === "Bath") notes.push("厨卫的固定件位置按全景估计，待现场复核。");
  if (["A", "B", "C"].includes(room)) notes.push("衣柜、飘窗台等现状固定件的位置按全景换算，待现场复核。");
  if (br.plan === "L") notes.push(`客厅沿用第 4 章的「${s.layoutName}」，当前是${sceneLabel(scene)}状态，场景在图 5-1 的工具条里切换。`);
  return (
    <section className="block style-board" aria-labelledby="board-title">
      <h3 id="board-title" className="sub">
        拼贴与平面
      </h3>
      <p className="banner">风格参考拼贴，不是本屋效果图。指针或键盘焦点停在一块拼贴上，平面上对应的物件会加粗。</p>
      <Tool name="房间">
        <Seg label="房间" value={room} options={BOARD_ROOMS.map((r) => ({ id: r.id, label: r.name }))} onChange={(r) => set({ room: r })} />
      </Tool>
      {room === "house" ? (
        <div className="cols">
          <figure className="plan">
            <Plan {...plan} label={`全屋平面，${s.name}`} />
            <Legend />
            <figcaption className="fig-cap">
              <span className="fig-no">图 5-2</span>
              <span className="fig-text">{s.name} · 全屋平面 · 客厅为日常状态</span>
            </figcaption>
          </figure>
          <div className="block">
            <h4 className="h4">现状硬装：留还是改</h4>
            <RetainedTable s={s} />
            <h4 className="h4">全屋改动条数</h4>
            <LevelCounts s={s} />
            <p className="caption">条数不代表花费。{LEVELS.map((l) => `${l.id} ${l.name}`).join("，")}。</p>
          </div>
        </div>
      ) : (
        <>
          <p className="caption">{br.role}</p>
          <div className="cols room-cols">
            <Tiles s={s} roomId={room} hot={hot} onHot={setHot} />
            <figure className="plan sticky-plan">
              <Plan {...plan} label={`${br.name}平面，${s.name}`} hot={hot} onHot={setHot} />
              <Legend />
              <figcaption className="fig-cap">
                <span className="fig-no">图 5-2</span>
                <span className="fig-text">
                  {s.name} · {br.name}平面 · 编号对应左边的拼贴
                </span>
              </figcaption>
              {notes.map((n) => (
                <p key={n} className="caption">
                  {n}
                </p>
              ))}
            </figure>
          </div>
          <Changes list={s.rooms[room]?.changes ?? []} />
        </>
      )}
    </section>
  );
}

export function Styles() {
  const id = usePresent((st) => st.style.scheme);
  const set = usePresent((st) => st.setStyle);
  const s = schemeOf(id);
  return (
    <Chapter
      id="styles"
      no={5}
      title="四套风格"
      lead="四套都放在同一套复尺房子里，用同一组机位和同一套光线比较，差别只在硬装和软装。暖古典的颜色超出其他三套守的上限，放进来作对照，用来试探你能接受多少颜色。"
    >
      <div className="tabs">
        <Seg label="风格方案" value={id} options={SCHEMES.map((x) => ({ id: x.id, label: x.control ? `${x.name}（对照）` : x.name }))} onChange={(scheme) => set({ scheme })} />
      </div>
      <Head s={s} />
      <StyleFigure s={s} />
      <Board s={s} />
    </Chapter>
  );
}
