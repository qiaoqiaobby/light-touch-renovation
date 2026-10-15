// 构建页面四：先跑三维审查，再打成一个可双击打开的 HTML
// 用法：node scripts/build-decor.mjs [时间戳，默认当前时间 YYYYMMDDHHmm]
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const dist = resolve(root, "mid/decor-dist");
const assets = readdirSync(resolve(dist, "assets"));
const js = assets.filter((name) => name.endsWith(".js"));
const css = assets.filter((name) => name.endsWith(".css"));
if (js.length !== 1 || css.length > 1) throw new Error(`三维构建产物不是单文件：${assets.join(", ")}`);

let html = readFileSync(resolve(dist, "decor.html"), "utf8");
const script = readFileSync(resolve(dist, "assets", js[0]), "utf8").replace(/<\/script/gi, "<\\/script");
html = html.replace(/<script\b[^>]*src="\.\/assets\/[^"]+\.js"[^>]*><\/script>/, () => `<script type="module">${script}</script>`);
if (css.length) {
  const style = readFileSync(resolve(dist, "assets", css[0]), "utf8");
  html = html.replace(/<link\b[^>]*href="\.\/assets\/[^"]+\.css"[^>]*>/, () => `<style>${style}</style>`);
}
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");
if (/src=|href=|url\(/.test(html.replace(/<style>[\s\S]*<\/style>/, "").replace(/<script[\s\S]*<\/script>/, ""))) {
  const external = html.match(/(?:src|href|url\()[^)"'\s>]*/g) ?? [];
  throw new Error(`外部 URL：${external.join(", ")}`);
}
const out = resolve(root, "docs/plan", `全屋三维装修-${stamp}.html`);
writeFileSync(out, html);
const bytes = statSync(out).size;
if (bytes > 8 * 1024 * 1024) throw new Error(`产物 ${bytes} 字节，超过 8 MB`);
console.log(`${out} ${bytes} 字节`);
