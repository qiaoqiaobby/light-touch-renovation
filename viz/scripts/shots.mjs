// 浏览器实测：无头 Chrome + DevTools 协议（Node 自带 WebSocket，无新增依赖）
// 逐个切换 模型 × 使用状态 × 昼夜 × 视图 截图到 mid/shots/，汇总控制台报错与最小字号
// 用法：node viz/scripts/shots.mjs <html 路径>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODELS, STATES } from '../src/schemes.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = resolve(process.argv[2]);
const outDir = resolve(root, 'mid/shots');
const profile = resolve(root, 'mid/chrome-profile');
const PORT = 9333;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1600,1000',
  '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });

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
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(msg.params.type))
      errors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`log: ${msg.params.entry.text}`);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await sleep(3000);

  const click = (bar, label) => evaluate(`(() => { const b = [...document.querySelectorAll('#${bar} button')].find((x) => x.textContent === ${JSON.stringify(label)}); if (!b || b.disabled) return false; b.click(); return true; })()`);
  const shot = async (name) => {
    await sleep(400);
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(result.data, 'base64'));
  };

  let n = 0;
  for (const m of MODELS) {
    await click('modelBar', m.label);
    for (const view of ['透视', '俯视']) {
      await click('viewBar', view);
      const states = m.key === 'current' || view === '俯视' ? (m.key === 'current' ? [null] : STATES) : STATES;
      for (const st of states) {
        if (st) await click('stateBar', st.label);
        for (const light of view === '俯视' ? ['昼'] : ['昼', '夜']) {
          await click('lightBar', light);
          await shot(`${m.key}-${st ? st.key : 'daily'}-${view === '透视' ? 'persp' : 'plan'}-${light === '昼' ? 'day' : 'night'}`);
          n++;
        }
      }
    }
  }

  const fonts = await evaluate(`(() => { const s = new Set(); document.querySelectorAll('body *').forEach((e) => { if (e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) s.add(parseFloat(getComputedStyle(e).fontSize)); }); return [...s].sort((a, b) => a - b); })()`);
  const disabledCurrent = await evaluate(`(() => { document.querySelector('#modelBar button').click(); return [...document.querySelectorAll('#stateBar button')].every((b) => b.disabled); })()`);
  console.log(`Chrome：${version.Browser}`);
  console.log(`截图：${n} 张 → ${outDir}`);
  console.log(`页面文字字号（px）：${fonts.join(', ')}；最小 ${Math.min(...fonts)}`);
  console.log(`现状下使用状态按钮全部禁用：${disabledCurrent}`);
  console.log(`控制台报错与警告：${errors.length} 条${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  ws.close();
} finally {
  chrome.kill();
}
