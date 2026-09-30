// 构建：esbuild 打包 main.js（含 three.js），与 CSS 一起内联进单个离线 HTML
// 用法：node viz/scripts/build.mjs [输出文件名时间戳，默认当前时间 YYYYMMDDHHmm]
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (f) => resolve(root, 'viz/src', f);

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = process.argv[2] || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;

const js = (await build({
  entryPoints: [src('main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const css = readFileSync(src('tokens.css'), 'utf8') + '\n' + readFileSync(src('styles.css'), 'utf8');
const html = readFileSync(src('index.html'), 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

const external = html.match(/https?:\/\/[^\s"')]+/g) || [];
const out = resolve(root, 'docs/plan', `客厅微改三方案-${stamp}.html`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`输出：${out}`);
console.log(`体积：${(statSync(out).size / 1024).toFixed(0)} KB`);
console.log(`外部 URL 引用：${external.length} 处${external.length ? '\n  ' + [...new Set(external)].join('\n  ') : ''}`);
