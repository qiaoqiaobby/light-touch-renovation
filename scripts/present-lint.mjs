// 交付页规范检查（DESIGN.md 第 10 节）：tokens 对比度与字号下限、样式里没有 tokens 以外的视觉数值、
// 客户可见文字里没有品牌词、内部行话和旧尺寸数字、盲选池均衡。
// 用法：node scripts/present-lint.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMES } from '../boards/data/schemes.mjs';
import { BANNED } from '../boards/scripts/check.mjs';
import { pickPool, poolProblems } from '../src/present/pick.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'src/present');
const results = [];
const ok = (pass, text) => results.push([pass, text]);

/* ---------- tokens ---------- */
const tokenText = readFileSync(join(dir, 'tokens.css'), 'utf8');
const tokens = {};
for (const m of tokenText.matchAll(/(--p-[\w-]+):\s*([^;]+);/g)) if (!(m[1] in tokens)) tokens[m[1]] = m[2].trim();

const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const PAIRS = [
  ['--p-text', '--p-bg', 4.5], ['--p-text-2', '--p-bg', 4.5], ['--p-text', '--p-hover', 4.5], ['--p-text', '--p-press', 4.5],
  ['--p-text-2', '--p-hover', 4.5], ['--p-text-2', '--p-stage', 4.5], ['--p-text', '--p-panel', 4.5],
  ['--p-sel-text', '--p-sel-bg', 4.5], ['--p-sel-text', '--p-sel-hover', 4.5], ['--p-sel-text', '--p-sel-press', 4.5],
  ['--p-lv1-text', '--p-lv1-bg', 4.5], ['--p-lv2-text', '--p-lv2-bg', 4.5], ['--p-lv3-text', '--p-lv3-bg', 4.5], ['--p-lv4-text', '--p-lv4-bg', 4.5],
  ['--p-lv0-text', '--p-bg', 4.5], ['--p-plan-dim', '--p-plan-room', 4.5], ['--p-focus', '--p-bg', 3], ['--p-rule-strong', '--p-bg', 3],
];
for (const [fg, bg, min] of PAIRS) {
  const r = ratio(tokens[fg], tokens[bg]);
  ok(r >= min, `对比度 ${fg} / ${bg} = ${r.toFixed(2)}（要求 ≥ ${min}）`);
}
for (const [k, v] of Object.entries(tokens).filter(([k]) => k.startsWith('--p-fs-'))) ok(parseFloat(v) >= 12, `字号 ${k} = ${v}（下限 12px）`);
ok(/prefers-reduced-motion[\s\S]*--p-dur:\s*0ms/.test(tokenText), '减弱动效时 --p-dur 归零');

/* ---------- 样式里的原始数值 ---------- */
const css = readFileSync(join(dir, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const raw = [];
css.split('\n').forEach((line, i) => {
  if (/^\s*@media/.test(line)) return;
  for (const m of line.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
    const [, prop, val] = m;
    if (prop.startsWith('--')) continue;
    const stripped = val.replace(/var\([^)]*\)/g, '').replace(/"[^"]*"/g, '');
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b\d*\.?\d+(px|ms|s|rem|em|vh|vw|pt)\b/i.test(stripped)) raw.push(`styles.css:${i + 1} ${prop}: ${val.trim()}`);
  }
});
ok(raw.length === 0, `styles.css 里 tokens 以外的视觉数值：${raw.length} 处${raw.length ? '\n    ' + raw.join('\n    ') : ''}`);
const breakpoints = [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1].trim()).filter((q) => !q.startsWith('prefers-'));
const allowed = new Set(['max-width: 960px', 'pointer: coarse']);
ok(breakpoints.every((q) => allowed.has(q)), `媒体查询只用登记的两处（960px、pointer: coarse）：${[...new Set(breakpoints)].join('；')}`);

/* ---------- 客户可见文字 ---------- */
const files = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) files.push(p);
  }
};
walk(dir);
const JARGON = [/变异/, /审查/, /ΔE/, /CIEDE/i, /色差\s*\d/, /90\s?寸/, /80\s?寸/, /通道约?\s?1\.8\s?m/, /1\.8\s?m\s?通道/, /audit/i, /mutate/i, /docs\/plan/, /src\//];
const hits = [];
const scan = (label, text) => {
  for (const w of BANNED) if (text.includes(w)) hits.push(`${label}：品牌或价格词「${w}」`);
  for (const re of JARGON) if (re.test(text)) hits.push(`${label}：内部用语或旧尺寸「${text.match(re)[0]}」`);
};
for (const f of files) {
  // 只看字符串和 JSX 文字：去掉注释和 import 行
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '').replace(/^import .*$/gm, '');
  const strings = [...src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1|>([^<>{}]+)</g)].map((m) => m[2] ?? m[3]).filter((s) => s && /[一-鿿]/.test(s));
  for (const s of strings) scan(f.replace(root + '/', ''), s);
}
const schemeStrings = (s) => [s.name, s.claim, s.cost, s.shared, s.contrast, ...Object.values(s.rooms).flatMap((r) => [...r.changes.map((c) => c.text), ...r.tiles.map((t) => t.take ?? ''), ...(r.pieces ?? []).map((p) => p.name)]), ...Object.values(s.retained).map((r) => r.text ?? '')];
for (const s of SCHEMES) for (const t of schemeStrings(s)) scan(`方案数据 ${s.name}`, t);
ok(hits.length === 0, `客户可见文字守门：${hits.length} 处${hits.length ? '\n    ' + [...new Set(hits)].join('\n    ') : ''}`);

// 空跑防护：守门必须能抓到这几条
const before = hits.length;
for (const bad of ['方案页的 90 寸幕布', '西侧通道约 1.8 m', '色差 27', '变异 10 项', '索耐特']) scan('自检', bad);
const caught = hits.length - before;
hits.length = before;
ok(caught === 5, `守门自检：5 条故意写错的文字抓到 ${caught} 条`);

/* ---------- 盲选池 ---------- */
const pool = pickPool(SCHEMES);
const pp = poolProblems(pool, SCHEMES);
ok(pp.length === 0, `盲选池 ${pool.length} 块，每套均衡、无共用裁切${pp.length ? '\n    ' + pp.join('\n    ') : ''}`);

let pass = 0;
let fail = 0;
for (const [p, text] of results) {
  p ? pass++ : fail++;
  console.log(`${p ? 'PASS' : 'FAIL'}  ${text}`);
}
console.log(`\n合计 ${results.length} 项：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
