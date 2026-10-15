// 构建页面三：先跑方案检查，失败就不出页面；再把用到的裁切内联成 data URI，打包成单个离线 HTML
// 用法：node boards/scripts/build.mjs [时间戳，默认当前时间 YYYYMMDDHHmm]
// 前置：python3 boards/scripts/crop.py
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS, DOORS } from '../../src/floorplan/plan-data.ts';
import { SCHEMES as LAYOUTS, SCENES, resolvePieces } from '../../src/floorplan/living-schemes.ts';
import { SCHEMES, RULES } from '../data/schemes.mjs';
import { FIXED, RETAINED, BOARD_ROOMS } from '../data/house.mjs';
import { check, BANNED } from './check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = process.argv[2] || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;

const { problems, facts } = check(SCHEMES);
if (problems.length) {
  console.error(`方案检查失败 ${problems.length} 项，不构建：\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const cropMeta = JSON.parse(readFileSync(resolve(root, 'mid/jalo/crops/crops.json'), 'utf8'));
const used = new Set([...SCHEMES.flatMap((s) => Object.values(s.rooms).flatMap((r) => r.tiles.map((t) => t.crop))), ...RETAINED.map((r) => r.swatch)]);
const crops = {};
for (const id of used) {
  const c = cropMeta[id];
  const b64 = readFileSync(resolve(root, 'mid/jalo/crops', `${id}.webp`)).toString('base64');
  crops[id] = { name: c.name, take: c.take ?? '', img: c.img ?? null, w: c.w, h: c.h, tags: c.tags ?? [], palette: c.palette, src: `data:image/webp;base64,${b64}` };
}

const layouts = {};
for (const L of LAYOUTS) {
  layouts[L.id] = {};
  for (const sc of SCENES) layouts[L.id][sc.id] = resolvePieces(L, sc.id).map(({ states, only, ...p }) => p);
}

const data = {
  meta: {
    date,
    foot: [
      '拼贴：裁自 docs/买家秀第16季.md 的用户返图，只作风格参考，标图号便于回查原图。素材属于第三方，只给业主本人看，不对外分享。',
      '现状材质块：裁自 VR/VR离线全景.html（2026-09 上一任住户拍摄）。卧室、厨卫固定件位置按全景换算，待现场复核。',
      '平面：房间轮廓与门取自 docs/plan/户型净尺寸核算-202610121252.html（单个尺寸约 ±15 mm）。客厅三种布局沿用户型三维 src/floorplan/living-schemes.ts。',
      `检查：boards/scripts/check.mjs 失败 0 项。色差用 CIEDE2000，阈值 ${RULES.deltaE}；彩度不超过 ${RULES.neutralChroma} 算中性色；卧室通行宽度 ${RULES.bedroomWalk} mm。`,
      '房间分工沿用 2026-10-01 全屋设计：卧室 A 主卧，卧室 B 书房兼客房，卧室 C 衣帽间兼工作角（假设，待业主确认）。',
    ],
  },
  rules: RULES,
  rooms: ROOMS.map(({ id, name, poly, glass }) => ({ id, name, poly, glass })),
  doors: DOORS,
  fixed: FIXED,
  boardRooms: BOARD_ROOMS,
  retained: RETAINED,
  scenes: SCENES,
  layouts,
  schemes: SCHEMES,
  crops,
  facts,
};

const js = (await build({
  entryPoints: [resolve(root, 'boards/src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const css = readFileSync(resolve(root, 'viz/src/tokens.css'), 'utf8') + '\n' + readFileSync(resolve(root, 'boards/src/styles.css'), 'utf8');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const html = readFileSync(resolve(root, 'boards/src/index.html'), 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__DATA__*/', () => json)
  .replace('/*__JS__*/', () => js);

const text = html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, '');
const external = text.match(/https?:\/\/[^\s"')]+/g)?.filter((u) => !u.startsWith('http://www.w3.org/')) ?? [];
const banned = BANNED.filter((w) => text.includes(w));
if (banned.length) {
  console.error(`页面文字出现禁词：${banned.join('、')}`);
  process.exit(1);
}

const out = resolve(root, 'docs/plan', `全屋风格方案-${stamp}.html`);
writeFileSync(out, html);
console.log(`输出：${out}`);
console.log(`体积：${(statSync(out).size / 1024).toFixed(0)} KB，内联裁切 ${used.size} 块`);
console.log(`外部 URL 引用：${external.length} 处${external.length ? '\n  ' + [...new Set(external)].join('\n  ') : ''}`);
console.log('禁词：0 处');
