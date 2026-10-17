/**
 * 两个观察器：当前章节（视口 40% 处的一条细带落在哪一章），和该激活哪张三维图。
 * 同一时刻只挂一个画布：最可见、可见比例不低于 MIN 且停留 DWELL 毫秒的图才激活；全部离开视口后卸载。
 */
import { useEffect } from "react";
import { usePresent, type ChapterId, type FigId } from "./store";

const MIN = 0.35;
const DWELL = 400;
/** 在第 5 章停留这么久，才算「挑选前看过方案」。 */
const SAW = 1500;

export function useChapterObserver() {
  useEffect(() => {
    let sawTimer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.chapter as ChapterId;
          usePresent.getState().setChapter(id);
          window.clearTimeout(sawTimer);
          if (id === "styles") {
            sawTimer = window.setTimeout(() => {
              const s = usePresent.getState();
              if (s.chapter === "styles" && !s.answers.revealed && !s.answers.sawStyles) s.setAnswers({ sawStyles: true });
            }, SAW);
          }
        }
      },
      { rootMargin: "-40% 0px -59% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      window.clearTimeout(sawTimer);
    };
  }, []);
}

export function useFigureObserver() {
  useEffect(() => {
    const ratios = new Map<FigId, number>();
    let timer = 0;
    const decide = () => {
      let best: FigId | null = null;
      let top = MIN;
      for (const [id, r] of ratios)
        if (r >= top) {
          best = id;
          top = r;
        }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const s = usePresent.getState();
        if (best && s.active !== best) s.setActive(best);
        if (!best && s.active && (ratios.get(s.active) ?? 0) === 0) s.setActive(null);
      }, DWELL);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set((e.target as HTMLElement).closest<HTMLElement>("[data-fig]")!.dataset.fig as FigId, e.intersectionRatio);
        decide();
      },
      { threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] },
    );
    document.querySelectorAll<HTMLElement>("[data-fig] .fig-stage").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
}
