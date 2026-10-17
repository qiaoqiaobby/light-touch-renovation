// 构建交付页（住宅微改提案）：先跑全部审查和规范检查，任何一项失败都不出页面；再打成一个可双击打开的 HTML。
// 用法：node scripts/build-present.mjs [时间戳，默认当前时间 YYYYMMDDHHmm]
// 输出目录默认 docs/plan，回归比对时用 OUT_DIR=mid/regress/xxx 指到别处
// 前置：python3 boards/scripts/crop.py（拼贴裁切在 mid/jalo/crops/）
import { spawnSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineDist } from "./lib/inline-html.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = process.argv[2] || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;

const GATES = [
  ["户型与客厅三方案", ["scripts/audit-plan.mjs"]],
  ["风格方案", ["boards/scripts/check.mjs", "--mutate"]],
  ["全屋三维装修", ["scripts/audit-decor.mjs", "--mutate"]],
  ["交付页规范", ["scripts/present-lint.mjs"]],
];
for (const [name, args] of GATES) {
  const run = spawnSync(process.execPath, args, { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  if ((run.status ?? 1) !== 0) {
    console.error(`${name}检查失败，不构建（node ${args.join(" ")}）`);
    process.exit(run.status ?? 1);
  }
  console.log(`检查通过：${name}`);
}

const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--config", "vite.present.config.ts", "--logLevel", "warn"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PRESENT_DATE: date },
});
if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);

const html = inlineDist(resolve(root, "mid/present-dist"), "present.html");
const out = resolve(root, process.env.OUT_DIR || "docs/plan", `住宅微改提案-${stamp}.html`);
writeFileSync(out, html);
const bytes = statSync(out).size;
if (bytes > 8 * 1024 * 1024) throw new Error(`产物 ${bytes} 字节，超过 8 MB`);
console.log(`${out} ${bytes} 字节`);
