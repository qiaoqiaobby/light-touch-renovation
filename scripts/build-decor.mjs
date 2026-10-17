// 构建页面四：先跑三维审查，再打成一个可双击打开的 HTML
// 用法：node scripts/build-decor.mjs [时间戳，默认当前时间 YYYYMMDDHHmm]
// 输出目录默认 docs/plan，回归比对时用 OUT_DIR=mid/regress/xxx 指到别处
import { spawnSync } from "node:child_process";
import { writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineDist } from "./lib/inline-html.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = process.argv[2] || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;

const audit = spawnSync(process.execPath, ["scripts/audit-decor.mjs"], { cwd: root, stdio: "inherit" });
if ((audit.status ?? 1) !== 0) {
  console.error("三维审查失败，不构建");
  process.exit(audit.status ?? 1);
}

const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--config", "vite.decor.config.ts"], { cwd: root, stdio: "inherit" });
if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);

const html = inlineDist(resolve(root, "mid/decor-dist"), "decor.html");
const out = resolve(root, process.env.OUT_DIR || "docs/plan", `全屋三维装修-${stamp}.html`);
writeFileSync(out, html);
const bytes = statSync(out).size;
if (bytes > 8 * 1024 * 1024) throw new Error(`产物 ${bytes} 字节，超过 8 MB`);
console.log(`${out} ${bytes} 字节`);
