/**
 * 地址哈希：当前章节和三张图的状态。刷新、转发链接后能回到同一处。
 * 客户的选择不进哈希（它们存在本机），免得链接里带着别人的答案。
 */
import { SCENES } from "../floorplan/living-schemes";
import { usePresent, type ChapterId } from "./store";
import type { DecorView } from "../decor/store";

const CHAPTERS: ChapterId[] = ["cover", "brief", "site", "pick", "layouts", "styles", "compare", "ladder", "open", "appendix"];
const VIEWS: DecorView[] = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath", "orbit"];
const SCENE_IDS = SCENES.map((s) => s.id);
const one = <T extends string>(v: string | null, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : undefined);

export function readHash() {
  const q = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const s = usePresent.getState();
  const chapter = one(q.get("c"), CHAPTERS);
  if (chapter) s.setChapter(chapter);
  s.setSite({ view: one(q.get("sv"), VIEWS) ?? s.site.view, light: one(q.get("sl"), ["day", "night"] as const) ?? s.site.light });
  const scene = one(q.get("ls"), SCENE_IDS);
  if (scene) s.setLayoutScene(scene);
  s.setLayout({ scheme: one(q.get("lp"), ["s1", "s2", "s3"] as const) ?? s.layout.scheme, mode: one(q.get("lm"), ["orbit", "top"] as const) ?? s.layout.mode });
  s.setStyle({
    scheme: one(q.get("t"), ["S1", "S2", "S3", "S4"] as const) ?? s.style.scheme,
    stage: one(q.get("st"), ["L0", "L1", "L2", "L3"] as const) ?? s.style.stage,
    view: one(q.get("v"), VIEWS) ?? s.style.view,
    light: one(q.get("l"), ["day", "night"] as const) ?? s.style.light,
    scene: one(q.get("sc"), SCENE_IDS) ?? s.style.scene,
    room: one(q.get("r"), ["house", "L", "E", "A", "B", "C", "K", "Bath"] as const) ?? s.style.room,
  });
  return chapter;
}

export function writeHash() {
  return usePresent.subscribe((s) => {
    const q = new URLSearchParams({
      c: s.chapter,
      sv: s.site.view,
      sl: s.site.light,
      ls: s.layoutScene,
      lp: s.layout.scheme,
      lm: s.layout.mode,
      t: s.style.scheme,
      st: s.style.stage,
      v: s.style.view,
      l: s.style.light,
      sc: s.style.scene,
      r: s.style.room,
    });
    const next = `#${q}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  });
}
