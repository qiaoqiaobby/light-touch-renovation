/** 把客户的选择整理成一段纯文字，方便复制发回设计方。 */
import { LAYOUT_NAMES, SCHEMES } from "./data";
import { DIMS } from "./content";
import { POOL } from "./pool";
import type { Answers } from "./store";

export function resultText(a: Answers) {
  const lines: string[] = [`住宅微改提案 · 业主的选择（页面日期 ${__PRESENT_DATE__}）`, ""];
  if (!a.revealed) {
    lines.push(`一、盲选拼贴：${a.picked.length ? `已选 ${a.picked.length} 块，还没揭晓` : "还没挑"}`);
  } else {
    const counts = SCHEMES.map((s) => `${s.name} ${POOL.filter((t) => t.scheme === s.id && a.picked.includes(t.crop)).length} 块`);
    lines.push(`一、盲选拼贴：挑了 ${a.picked.length} 块（${a.sawStyles ? "挑选前已经看过第 5 章的方案" : "挑选前没有看过方案"}）`);
    lines.push(`    ${counts.join("，")}`);
    lines.push(`    裁切编号：${a.picked.join("、")}`);
  }
  lines.push(`二、客厅布局倾向：${a.layoutPref ? (a.layoutPref === "any" ? "都可以" : LAYOUT_NAMES[a.layoutPref].short) : "还没选"}`);
  const used = Object.values(a.points).reduce((x, y) => x + y, 0);
  lines.push(`三、10 点权重：${DIMS.map((d) => `${d.name} ${a.points[d.id]}`).join("，")}（已分 ${used} / 10）`);
  lines.push(`四、补充说明：${a.note.trim() || "无"}`);
  return lines.join("\n");
}
