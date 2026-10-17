/**
 * 客户的选择存在本机浏览器。file:// 下 Chrome 让所有本地页面共用一份 localStorage，键名带命名空间和版本。
 * 存储不可用（无痕窗口、被禁用、文件预览器）时静默跳过，页面照常工作，只是刷新后选择不保留。
 */
import { NO_POINTS, usePresent, type Answers } from "./store";

const KEY = "light-touch/present/v1";

export function loadAnswers() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Answers>;
    const points = { ...NO_POINTS, ...(saved.points ?? {}) };
    const valid = Object.values(points).every((v) => Number.isInteger(v) && v >= 0) && Object.values(points).reduce((a, b) => a + b, 0) <= 10;
    usePresent.getState().setAnswers({
      picked: Array.isArray(saved.picked) ? saved.picked.filter((x) => typeof x === "string").slice(0, 5) : [],
      revealed: saved.revealed === true,
      sawStyles: saved.sawStyles === true,
      points: valid ? points : { ...NO_POINTS },
      layoutPref: saved.layoutPref ?? null,
      note: typeof saved.note === "string" ? saved.note : "",
    });
  } catch {
    /* 存储不可用：忽略 */
  }
}

export function persistAnswers() {
  return usePresent.subscribe((state, prev) => {
    if (state.answers === prev.answers) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.answers));
    } catch {
      /* 存储不可用：忽略 */
    }
  });
}
