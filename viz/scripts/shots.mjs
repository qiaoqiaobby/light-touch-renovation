// 浏览器实测：无头 Chrome + DevTools 协议（Node 自带 WebSocket，无新增依赖）
// 逐个切换 模型 × 使用状态 × 昼夜 × 视图 截图到 mid/shots/，另截每个模型的全屋俯视与全屋透视，汇总控制台报错与最小字号
// 用法：node viz/scripts/shots.mjs <html 路径> [basic | creative，默认 basic]
// creative 另外借页面的测试钩子 window.__viz，定格每个方案「收起 → 多人聚会」变形的 0 / 50 / 100% 三帧
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = resolve(process.argv[2]);
const kind = process.argv[3] || 'basic';
const { MODELS, STATES } = await import(kind === 'creative' ? '../src/creative/schemes.js' : '../src/schemes.js');
const outDir = resolve(root, 'mid/shots', kind + (process.env.GPU ? '-gpu' : ''));
const profile = resolve(root, 'mid/chrome-profile');
const PORT = 9333;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  // 默认用软件渲染保证可复现；设环境变量 GPU=1 时改用本机显卡（D3D11），用于测真实帧耗时与环境光遮蔽效果
  ...(process.env.GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']),
  '--window-size=1600,1000',
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
    await sleep(kind === 'creative' ? 1000 : 400); // 页面二要等变形动画（600 ms）结束
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

  // 全屋：每个模型一张全屋俯视、一张拉远的全屋透视（滚轮拉远后再拉回，不影响后续截图）
  const wheel = async (dy, times) => {
    for (let i = 0; i < times; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 560, y: 500, deltaX: 0, deltaY: dy });
      await sleep(60);
    }
  };
  for (const m of MODELS) {
    await click('modelBar', m.label);
    await click('stateBar', STATES[0].label);
    await click('lightBar', '昼');
    await click('viewBar', '全屋');
    await shot(`${m.key}-house-plan-day`);
    await click('viewBar', '透视');
    await wheel(400, 6);
    await shot(`${m.key}-house-persp-day`);
    await wheel(-400, 6);
    n += 2;
  }

  if (kind === 'creative') {
    await click('viewBar', '透视');
    await click('lightBar', '昼');
    for (const m of MODELS.filter((x) => x.key !== 'current')) {
      await click('modelBar', m.label);
      for (const t of [0, 0.5, 1]) {
        await evaluate(`window.__viz.seek('daily', 'party', ${t})`);
        await shot(`anim-${m.key}-daily-party-${Math.round(t * 100)}`);
        n++;
      }
      await evaluate(`window.__viz.settle('daily')`);
    }
  }
  const perf = await evaluate(`JSON.stringify({ frameMs: document.body.dataset.frameMs, ao: document.body.dataset.ao, gpu: document.body.dataset.gpu })`);
  const fonts = await evaluate(`(() => { const s = new Set(); document.querySelectorAll('body *').forEach((e) => { if (e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) s.add(parseFloat(getComputedStyle(e).fontSize)); }); return [...s].sort((a, b) => a - b); })()`);
  const disabledCurrent = await evaluate(`(() => { [...document.querySelectorAll('#modelBar button')].find((b) => b.textContent === '现状').click(); return [...document.querySelectorAll('#stateBar button')].every((b) => b.disabled); })()`);
  console.log(`Chrome：${version.Browser}`);
  console.log(`截图：${n} 张 → ${outDir}`);
  if (kind === 'creative') console.log(`首帧耗时与环境光遮蔽：${perf}`);
  console.log(`页面文字字号（px）：${fonts.join(', ')}；最小 ${Math.min(...fonts)}`);
  console.log(`现状下使用状态按钮全部禁用：${disabledCurrent}`);
  console.log(`控制台报错与警告：${errors.length} 条${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  ws.close();
} finally {
  chrome.kill();
}
