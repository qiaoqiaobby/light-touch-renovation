// 规范检查：tokens 对比度（WCAG AA）、字号下限、styles.css 视觉数值是否全部引用 tokens
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = (f) => resolve(dirname(fileURLToPath(import.meta.url)), '../src', f);
const tokens = Object.fromEntries([...readFileSync(src('tokens.css'), 'utf8').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const results = [];
const PAIRS = [
  ['--c-text', '--c-bg', 4.5], ['--c-text-2', '--c-bg', 4.5], ['--c-text', '--c-surface-hover', 4.5],
  ['--c-text', '--c-surface-active', 4.5], ['--c-selected-text', '--c-selected-bg', 4.5],
  ['--c-level-1-text', '--c-level-1-bg', 4.5], ['--c-level-2-text', '--c-level-2-bg', 4.5], ['--c-level-3-text', '--c-level-3-bg', 4.5],
  ['--c-focus', '--c-bg', 3],
];
for (const [fg, bg, min] of PAIRS) {
  const r = ratio(tokens[fg], tokens[bg]);
  results.push([r >= min, `对比度 ${fg} / ${bg} = ${r.toFixed(2)}（要求 ≥ ${min}）`]);
}
results.push([ratio(tokens['--c-level-0-text'], tokens['--c-bg']) >= 4.5, `对比度 --c-level-0-text / --c-bg（L0 透明底）= ${ratio(tokens['--c-level-0-text'], tokens['--c-bg']).toFixed(2)}`]);

for (const [k, v] of Object.entries(tokens).filter(([k]) => k.startsWith('--fs-'))) {
  results.push([parseFloat(v) >= 12, `字号 ${k} = ${v}（下限 12px）`]);
}

const VISUAL = /^(color|background|background-color|border|border-[\w-]+|outline|outline-offset|padding|padding-[\w-]+|margin|margin-[\w-]+|gap|font-size|font-weight|line-height|border-radius|box-shadow|transition|width|height|top|right|bottom|left)$/;
const raw = [];
readFileSync(src('styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').forEach((line, i) => {
  for (const m of line.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
    const [, prop, val] = m;
    if (!VISUAL.test(prop)) continue;
    const stripped = val.replace(/var\([^)]*\)/g, '');
    if (/#[0-9a-f]{3,8}\b|\b\d*\.?\d+(px|ms|rem|em|vh|vw)\b|rgba?\(/i.test(stripped)) raw.push(`styles.css:${i + 1} ${prop}: ${val.trim()}`);
  }
});
results.push([raw.length === 0, `styles.css 视觉数值未引用 tokens：${raw.length} 处${raw.length ? '\n    ' + raw.join('\n    ') : ''}`]);

let pass = 0, fail = 0;
for (const [ok, text] of results) { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`); }
console.log(`\n合计 ${results.length} 项：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
