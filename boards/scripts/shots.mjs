// 页面三实测：无头 Chrome + DevTools 协议，逐个 方案 × 房间 截整页图到 mid/shots/boards/，
// 汇总控制台报错、最小字号（含平面里按 viewBox 缩放后的 SVG 文字）、横向溢出、图片加载，并验证拼贴与平面联动
// 用法：node boards/scripts/shots.mjs <html 路径>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = resolve(process.argv[2]);
const outDir = resolve(root, 'mid/shots/boards');
const PORT = 9334;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${resolve(root, 'mid/chrome-profile-boards')}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });

try {
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); }
  }
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(msg.params.type)) errors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`log: ${msg.params.entry.text}`);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

  const url = pathToFileURL(html).href;
  const open = async (hash, width = 1440) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(100);
    await send('Page.navigate', { url: `${url}#${hash}` });
    await sleep(900);
    await evaluate(`Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => {
      i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true });
    }))).then(() => true)`);
  };
  const probe = () => evaluate(`(() => {
    const sizes = new Set();
    document.querySelectorAll('body *').forEach((e) => {
      if (e.closest('svg')) return;
      if ([...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) sizes.add(Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100);
    });
    document.querySelectorAll('.plan svg').forEach((svg) => {
      const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      svg.querySelectorAll('text').forEach((t) => sizes.add(Math.round(parseFloat(t.getAttribute('font-size')) * k * 100) / 100));
    });
    const imgs = [...document.images];
    const arcsOut = [...document.querySelectorAll('.plan svg')].reduce((n, svg) => {
      const rooms = [...svg.querySelectorAll('polygon.room')];
      return n + [...svg.querySelectorAll('.door-arc')].filter((a) => {
        const p = a.getPointAtLength(a.getTotalLength() / 2);
        return !rooms.some((r) => r.isPointInFill(new DOMPoint(p.x, p.y)));
      }).length;
    }, 0);
    return {
      arcsOut,
      fonts: [...sizes].sort((a, b) => a - b),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      imgs: imgs.length,
      broken: imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).length,
      h: document.documentElement.scrollHeight,
    };
  })()`);
  const shot = async (name, info) => {
    await send('Emulation.setDeviceMetricsOverride', { width: info.width, height: Math.min(info.h, 6000), deviceScaleFactor: 1, mobile: info.width < 600 });
    await sleep(250);
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(result.data, 'base64'));
  };

  const data = JSON.parse(await (async () => { await open('s=S1&r=house&v=single'); return evaluate('document.getElementById("data").textContent'); })());
  const rooms = data.boardRooms.map((r) => r.id);
  let n = 0;
  let minFont = Infinity;
  let maxOverflow = 0;
  let broken = 0;
  let imgs = 0;
  let arcsOut = 0;
  const runs = [];
  for (const sch of data.schemes) for (const r of rooms) runs.push([`single-${sch.id}-${r}`, `s=${sch.id}&r=${r}&v=single&sc=daily`, 1440]);
  for (const r of rooms) runs.push([`compare-${r}`, `s=S1&r=${r}&v=compare&sc=daily`, 1440]);
  runs.push(['single-S2-L-party', 's=S2&r=L&v=single&sc=party', 1440]);
  runs.push(['narrow-S1-L', 's=S1&r=L&v=single&sc=daily', 390]);
  runs.push(['narrow-compare-A', 's=S3&r=A&v=compare&sc=daily', 390]);
  runs.push(['narrow-S4-house', 's=S4&r=house&v=single&sc=daily', 390]);
  for (const [name, hash, width] of runs) {
    await open(hash, width);
    const p = await probe();
    minFont = Math.min(minFont, ...p.fonts);
    maxOverflow = Math.max(maxOverflow, p.overflow);
    broken += p.broken;
    imgs += p.imgs;
    arcsOut += p.arcsOut;
    await shot(name, { width, h: p.h });
    n++;
  }

  // 签名元素：悬停一块拼贴，平面上同编号物件要高亮；悬停平面物件，拼贴要高亮
  await open('s=S1&r=A&v=single&sc=daily');
  const linkOk = await evaluate(`(() => {
    const tile = document.querySelector('.tile[data-piece="a-chest"]');
    tile.dispatchEvent(new MouseEvent('mouseenter'));
    const a = document.querySelector('svg .piece[data-piece="a-chest"]').classList.contains('on');
    tile.dispatchEvent(new MouseEvent('mouseleave'));
    const off = !document.querySelector('svg .piece[data-piece="a-chest"]').classList.contains('on');
    const rect = document.querySelector('svg .piece[data-piece="a-bed"]');
    rect.dispatchEvent(new MouseEvent('mouseenter'));
    const b = [...document.querySelectorAll('.tile[data-piece="a-bed"]')].every((t) => t.classList.contains('on'));
    return a && off && b;
  })()`);
  // 键盘：用真实的 Tab 按键走到第一块拼贴，焦点框必须可见（:focus-visible），平面上对应物件同时高亮
  await open('s=S1&r=A&v=single&sc=daily');
  const key = async (type) => send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  const focusInfo = () => evaluate(`(() => {
    const a = document.activeElement; const cs = getComputedStyle(a);
    return { tile: a.matches('.tile'), button: a.matches('button'), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
      lit: a.dataset.piece ? !!document.querySelector('svg [data-piece="' + a.dataset.piece + '"].on') : false };
  })()`);
  let buttonRing = null;
  let keyOk = false;
  for (let i = 0; i < 40; i++) {
    await key('keyDown');
    await key('keyUp');
    const f = await focusInfo();
    if (f.button && buttonRing === null) buttonRing = f.ring;
    if (f.tile) { keyOk = f.ring && f.lit; break; }
  }
  keyOk = keyOk && buttonRing === true;

  console.log(`Chrome：${version.Browser}`);
  console.log(`截图：${n} 张 → ${outDir}`);
  console.log(`最小字号（含平面 SVG 文字按显示宽度换算）：${minFont.toFixed(2)} px`);
  console.log(`横向溢出最大：${maxOverflow} px`);
  console.log(`图片：${imgs} 次加载，失败 ${broken}`);
  console.log(`门扇弧线落在画出的房间之外：${arcsOut} 处`);
  console.log(`拼贴与平面联动（指针）：${linkOk ? '正常' : '失败'}`);
  console.log(`键盘：按钮焦点框 ${buttonRing ? '可见' : '不可见'}；Tab 到拼贴块时焦点框与平面高亮 ${keyOk ? '正常' : '失败'}`);
  console.log(`控制台报错与警告：${errors.length} 条${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  if (errors.length || minFont < 11.95 || maxOverflow > 0 || broken || arcsOut || !linkOk || !keyOk) process.exitCode = 1;
  ws.close();
} finally {
  chrome.kill();
}
