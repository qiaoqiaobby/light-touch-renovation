// 交付页截图与断言：无头 Chrome 通过 file:// 打开构建好的单文件，逐章截图并检查 DESIGN.md 第 10.8 节的预检项。
// 用法：node scripts/present-shots.mjs <html 路径>
// 截图在 mid/shots/present/，不入库。任何一项失败，退出码为 1。
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = resolve(process.argv[2] ?? "");
const outDir = resolve(root, "mid/shots/present");
const profile = resolve(root, "mid/chrome-profile-present");
const PORT = 9337;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 期望值：直接从客厅方案数据算，不手抄 ---------- */
mkdirSync(resolve(root, "mid"), { recursive: true });
await esbuild.build({ entryPoints: [resolve(root, "src/floorplan/scheme-metrics.ts")], bundle: true, platform: "node", format: "esm", outfile: resolve(root, "mid/present-metrics.mjs"), logLevel: "silent" });
const { spans } = await import(`${pathToFileURL(resolve(root, "mid/present-metrics.mjs")).href}?t=${Date.now()}`);
const fmt = (mm) => (Math.abs(mm) > 1000 ? `${(mm / 1000).toFixed(1)} m` : `${Math.round(mm)} mm`);
const EXPECT = spans().map((s) => ({ scheme: s.scheme, label: s.label, text: fmt(s.value) }));

rmSync(outDir, { recursive: true, force: true });
rmSync(profile, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "about:blank"], { stdio: "ignore" });

const results = [];
let shots = 0;
const check = (ok, text) => {
  results.push([Boolean(ok), text]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${text}`);
};

try {
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }
  if (!version) throw new Error("Chrome 没有起来");
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");
  // 模拟「减弱动效」：鸟瞰相机直接到位，软件渲染下不会拍到过渡途中的画面；也顺带走一遍 reduced-motion 路径
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const base = pathToFileURL(html).href;

  const open = async (width, height, hash = "", { touch = false } = {}) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
    await send("Emulation.setEmitTouchEventsForMouse", { enabled: touch });
    // 同一文件只改哈希的导航不会重新加载，先回到空白页，保证每次都是全新载入
    await send("Page.navigate", { url: "about:blank" });
    await sleep(200);
    await send("Page.navigate", { url: `${base}${hash}` });
    for (let i = 0; i < 60; i++) {
      if (await evaluate("Boolean(window.__present && document.querySelector('#cover'))")) return true;
      await sleep(250);
    }
    return false;
  };
  const shot = async (name) => {
    const { result } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(result.data, "base64"));
    shots++;
  };
  const probe = () =>
    evaluate(`(() => {
      const sizes = [];
      document.querySelectorAll('body *').forEach((e) => {
        if (e.closest('svg') || e.closest('.sr-only')) return;
        if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        sizes.push(parseFloat(getComputedStyle(e).fontSize));
      });
      document.querySelectorAll('svg.plan-svg').forEach((svg) => {
        const w = svg.getBoundingClientRect().width;
        if (!w) return;
        const k = w / svg.viewBox.baseVal.width;
        svg.querySelectorAll('text').forEach((t) => sizes.push(parseFloat(t.getAttribute('font-size')) * k));
      });
      const arcsOut = [...document.querySelectorAll('svg.plan-svg')].reduce((n, svg) => {
        const rooms = [...svg.querySelectorAll('polygon.room')];
        return n + [...svg.querySelectorAll('.door-arc')].filter((a) => {
          const p = a.getPointAtLength(a.getTotalLength() / 2);
          return !rooms.some((r) => r.isPointInFill(new DOMPoint(p.x, p.y)));
        }).length;
      }, 0);
      const imgs = [...document.images];
      return {
        font: Math.min(...sizes),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        canvases: document.querySelectorAll('canvas').length,
        arcsOut,
        broken: imgs.filter((i) => i.complete && !i.naturalWidth).length,
      };
    })()`);
  const stats = { font: Infinity, overflow: 0, canvases: 0, arcsOut: 0, broken: 0 };
  const record = async () => {
    const p = await probe();
    stats.font = Math.min(stats.font, p.font);
    stats.overflow = Math.max(stats.overflow, p.overflow);
    stats.canvases = Math.max(stats.canvases, p.canvases);
    stats.arcsOut = Math.max(stats.arcsOut, p.arcsOut);
    stats.broken = Math.max(stats.broken, p.broken);
    return p;
  };
  const scrollTo = (sel, block = "start") => evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: ${JSON.stringify(block)} })`);
  /** 等图激活并出首帧；SwiftShader 慢，首帧后再给一点时间让后期和阴影跟上。 */
  const waitFig = async (fig) => {
    for (let i = 0; i < 120; i++) {
      const ok = await evaluate(`window.__present.state().active === ${JSON.stringify(fig)} && !document.querySelector('[data-fig="${fig}"] .fig-loading') && Boolean(document.querySelector('[data-fig="${fig}"] canvas'))`);
      if (ok) {
        await sleep(1500);
        return true;
      }
      await sleep(250);
    }
    return false;
  };
  const call = (expr) => evaluate(`(async () => { const s = window.__present.state(); ${expr}; await new Promise((r) => setTimeout(r, 300)); })()`);

  /* ================= 桌面 1440 ================= */
  check(await open(1440, 900), "桌面：页面载入并暴露 __present");
  check(await evaluate("!document.getElementById('nojs')"), "桌面：脚本运行后，无脚本说明已移除");
  await record();
  await shot("1440-cover");

  for (const ch of ["brief", "site"]) {
    await scrollTo(`#${ch}`);
    await sleep(400);
    await record();
    await shot(`1440-${ch}`);
  }
  await scrollTo('[data-fig="site"] .fig-stage');
  check(await waitFig("site"), "第 2 章：现状三维激活并出首帧");
  const siteDecor = await evaluate("window.__present.decor()");
  check(siteDecor.stage === "L0", `第 2 章：装修引擎在 L0（实际 ${siteDecor.stage}）`);
  await record();
  await shot("1440-site-fig");

  /* ---------- 第 3 章：盲选流程（此时还没看过第 5 章） ---------- */
  await scrollTo("#pick");
  await sleep(400);
  await shot("1440-pick");
  const pool = await evaluate("document.querySelectorAll('.pick').length");
  check(pool === 32, `盲选池 ${pool} 块`);
  check(await evaluate("[...document.querySelectorAll('#pick button')].find((b) => b.textContent === '揭晓').disabled"), "盲选：一块没选时「揭晓」禁用");
  for (const i of [0, 3, 8, 15, 22, 27]) {
    await evaluate(`document.querySelectorAll('.pick')[${i}].click()`);
    await sleep(80);
  }
  const picked = await evaluate("window.__present.state().answers.picked.length");
  check(picked === 5, `盲选：点了 6 块，只收下 5 块（实际 ${picked}）`);
  const blocked = await evaluate("[...document.querySelectorAll('.pick')].filter((b) => b.disabled && b.title).length");
  check(blocked === 27, `盲选：选满后其余 27 块禁用并给出原因（实际 ${blocked}）`);
  await evaluate("[...document.querySelectorAll('#pick button')].find((b) => b.textContent === '揭晓').click()");
  await sleep(300);
  const tally = await evaluate("[...document.querySelectorAll('.tally .tally-n')].map((n) => Number(n.textContent))");
  check(tally.length === 4 && tally.reduce((a, b) => a + b, 0) === 5, `揭晓：四套计数之和为 5（${tally.join(" / ")}）`);
  const perScheme = await evaluate("Object.values([...document.querySelectorAll('.pick-tag')].reduce((m, t) => (m[t.textContent] = (m[t.textContent] || 0) + 1, m), {}))");
  check(perScheme.length === 4 && perScheme.every((n) => n === 8), `揭晓：每套各 8 块（${perScheme.join(" / ")}）`);
  await scrollTo(".reveal", "center");
  await sleep(300);
  await shot("1440-reveal");
  for (let k = 0; k < 11; k++) {
    await evaluate(`[...document.querySelectorAll('.points li')][${k % 6}].querySelectorAll('button')[1].click()`);
    await sleep(40);
  }
  const used = await evaluate("Object.values(window.__present.state().answers.points).reduce((a, b) => a + b, 0)");
  check(used === 10, `10 点：点了 11 次加号，只分出 10 点（实际 ${used}）`);
  check(await evaluate("[...document.querySelectorAll('.points li')].every((li) => li.querySelectorAll('button')[1].disabled)"), "10 点：分完后所有加号禁用");
  await record();

  /* ---------- 第 4 章 ---------- */
  await scrollTo("#layouts");
  await sleep(300);
  let dimsInMovie = 0;
  for (const scene of ["daily", "movie", "dine2", "party", "exercise"]) {
    await call(`s.setLayoutScene(${JSON.stringify(scene)})`);
    await scrollTo(".layout-grid");
    await sleep(300);
    await record();
    await shot(`1440-layouts-${scene}`);
    if (scene === "movie") dimsInMovie = await evaluate("document.querySelectorAll('.layout-col .dim-t').length");
  }
  const keys = await evaluate("[...document.querySelectorAll('.layout-col')].map((c, i) => [...c.querySelectorAll('.keys > div')].map((d) => [i, d.querySelector('dt').textContent, d.querySelector('dd').textContent]))");
  const order = { s1: 0, s2: 1, s3: 2 };
  for (const e of EXPECT) {
    const row = keys[order[e.scheme]].find(([, dt]) => dt === e.label);
    check(row && row[2].startsWith(e.text), `第 4 章：${e.label} 显示 ${row ? row[2] : "缺失"}，按数据应为 ${e.text}`);
  }
  check(dimsInMovie === 3, `第 4 章：观影场景下画出 3 条尺寸线（减的观看距离、分的幕布距离、空的投影距离；实际 ${dimsInMovie}）`);
  await scrollTo('[data-fig="layout"] .fig-stage');
  check(await waitFig("layout"), "第 4 章：户型三维激活并出首帧");
  const plan = await evaluate("window.__present.plan()");
  check(plan.others === false && plan.furniture === true, `第 4 章：卧室不放示意家具（others=${plan.others}）`);
  await shot("1440-layout-fig");
  await evaluate("[...document.querySelectorAll('#layouts .choose button')].find((b) => b.textContent === '分').click()");
  await record();

  /* ---------- 第 5 章：四套 × L0 / 最高阶段 × 入户 × 昼夜 ---------- */
  await scrollTo('[data-fig="style"] .fig-stage');
  check(await waitFig("style"), "第 5 章：装修三维激活并出首帧");
  for (const scheme of ["S1", "S2", "S3", "S4"]) {
    const top = scheme === "S2" || scheme === "S3" ? "L3" : "L2";
    for (const stage of ["L0", top]) {
      for (const light of ["day", "night"]) {
        await call(`s.setStyle({ scheme: "${scheme}", stage: "${stage}", view: "L-entry", light: "${light}", scene: "daily" })`);
        await sleep(1200);
        await record();
        await shot(`1440-style-${scheme}-${stage}-${light}`);
      }
    }
  }
  check(await evaluate("(() => { window.__present.state().setStyle({ scheme: 'S1' }); const b = [...document.querySelectorAll('[data-fig=\"style\"] .seg button')].find((x) => x.textContent.startsWith('L3')); return b.disabled && Boolean(b.title); })()"), "第 5 章：素木的 L3 按钮禁用并写明原因");

  // 两张图共用装修引擎：第 5 章的状态切走再回来要还原，第 2 章始终是 L0
  await call(`s.setStyle({ scheme: "S2", stage: "L3", view: "K", light: "night", scene: "daily" })`);
  await sleep(1000);
  await scrollTo('[data-fig="site"] .fig-stage');
  check(await waitFig("site"), "切回第 2 章：现状三维重新激活");
  const back = await evaluate("window.__present.decor()");
  check(back.stage === "L0" && back.view === "orbit", `切回第 2 章：引擎是 L0 / 鸟瞰（实际 ${back.stage} / ${back.view}）`);
  await scrollTo('[data-fig="style"] .fig-stage');
  check(await waitFig("style"), "再到第 5 章：装修三维重新激活");
  const again = await evaluate("window.__present.decor()");
  check(again.scheme === "S2" && again.stage === "L3" && again.view === "K" && again.light === "night", `再到第 5 章：状态还原为木与钢 / L3 / 厨房 / 夜晚（实际 ${again.scheme} / ${again.stage} / ${again.view} / ${again.light}）`);
  check((await evaluate("window.__present.state().answers.sawStyles")) === false, "盲选在看第 5 章之前完成，结果不标「看过方案」");

  // 滚轮：没按 Ctrl 时页面照常滚动；按住 Ctrl 时交给模型。无头 Chrome 要先把指针移到目标上，滚轮才有落点
  await call(`s.setStyle({ view: "orbit" })`);
  await sleep(1500);
  const wheel = async (modifiers) => {
    await scrollTo('[data-fig="style"] .fig-stage', "center");
    await sleep(500);
    const b = await evaluate("(() => { const r = document.querySelector('[data-fig=\"style\"] canvas').getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); return { x, y, hit: document.elementFromPoint(x, y)?.tagName }; })()");
    const before = await evaluate("window.scrollY");
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: b.x, y: b.y });
    await sleep(100);
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: b.x, y: b.y, deltaX: 0, deltaY: 300, modifiers });
    await sleep(600);
    return { hit: b.hit, before: Math.round(before), after: Math.round(await evaluate("window.scrollY")) };
  };
  const plain = await wheel(0);
  check(plain.hit === "CANVAS" && plain.after > plain.before, `滚轮停在三维上：页面照常滚动（落点 ${plain.hit}，${plain.before} → ${plain.after}）`);
  const ctrl = await wheel(2);
  check(ctrl.hit === "CANVAS" && Math.abs(ctrl.after - ctrl.before) < 2, `按住 Ctrl 滚轮：页面不动，交给模型缩放（落点 ${ctrl.hit}，${ctrl.before} → ${ctrl.after}）`);

  await call(`s.setStyle({ room: "A" })`);
  await scrollTo("#board-title");
  await sleep(300);
  await evaluate("document.querySelector('.style-board .tile[tabindex]').focus()");
  await sleep(200);
  check((await evaluate("document.querySelectorAll('.style-board .plan-svg .on').length")) > 0, "拼贴获得焦点时，平面上对应物件高亮");
  await record();
  await shot("1440-board-A");
  await call(`s.setStyle({ room: "house" })`);
  await record();

  for (const ch of ["compare", "ladder", "open", "appendix"]) {
    await scrollTo(`#${ch}`);
    await sleep(400);
    await record();
    await shot(`1440-${ch}`);
  }
  await evaluate("(() => { const t = document.querySelector('textarea.note'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, '预算待定，打算住五年以上'); t.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await sleep(300);
  const text = await evaluate("document.querySelector('textarea.result').value");
  check(text.includes("挑了 5 块") && text.includes("挑选前没有看过方案"), "结果文字：盲选块数与「挑选前没有看过方案」");
  check(text.includes("客厅布局倾向：分"), "结果文字：客厅布局倾向");
  check(text.includes("已分 10 / 10"), "结果文字：10 点权重");
  check(text.includes("打算住五年以上"), "结果文字：补充说明");
  check(stats.canvases <= 1, `同时存在的画布最多 ${stats.canvases} 个（上限 1）`);

  /* ---------- 刷新：选择保留，哈希还原 ---------- */
  await open(1440, 900, "#c=styles&t=S3&st=L3&v=A&l=night&sc=daily&r=B");
  await sleep(800);
  const restored = await evaluate("(() => { const s = window.__present.state(); return { picked: s.answers.picked.length, style: s.style, chapter: s.chapter, top: Math.round(document.getElementById('styles').getBoundingClientRect().top) }; })()");
  check(restored.picked === 5, `刷新后盲选仍是 5 块（实际 ${restored.picked}）`);
  check(restored.style.scheme === "S3" && restored.style.stage === "L3" && restored.style.view === "A" && restored.style.light === "night" && restored.style.room === "B", "带哈希打开：第 5 章状态还原为席地 / L3 / 卧室 A / 夜晚 / 卧室 B");
  check(Math.abs(restored.top) < 80 && restored.chapter === "styles", `带哈希打开：滚到第 5 章（章顶距视口 ${restored.top} px）`);

  // 同一页面里改哈希（点带哈希的链接）不会重载，页面要自己读
  await evaluate("location.hash = 'c=compare&t=S4&st=L1&v=E&l=day&sc=party&r=K'");
  await sleep(800);
  const hc = await evaluate("(() => { const s = window.__present.state().style; return s.scheme + '/' + s.stage + '/' + s.view + '/' + s.scene + '/' + s.room; })()");
  check(hc === "S4/L1/E/party/K", `同页改哈希：状态跟着改（实际 ${hc}）`);

  /* ---------- 存储不可用 ---------- */
  const noStore = await send("Page.addScriptToEvaluateOnNewDocument", { source: "Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };" });
  const errBefore = errors.length;
  check(await open(1440, 900), "localStorage 抛错时页面照常载入");
  await call("s.setAnswers({ note: 'x' })");
  check(errors.length === errBefore, `localStorage 抛错时没有新增报错（新增 ${errors.length - errBefore}）`);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: noStore.result.identifier });

  /* ---------- WebGL 不可用：图框换成平面 ---------- */
  const noGl = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; })();",
  });
  await open(1440, 900, "#c=site");
  await sleep(1500);
  const fb = await evaluate("({ fallbacks: document.querySelectorAll('.fig-fallback svg').length, canvases: document.querySelectorAll('canvas').length })");
  check(fb.fallbacks === 3 && fb.canvases === 0, `WebGL 不可用：3 张图都换成平面兜底（平面 ${fb.fallbacks}，画布 ${fb.canvases}）`);
  await scrollTo('[data-fig="site"]');
  await sleep(300);
  await record();
  await shot("1440-no-webgl");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: noGl.result.identifier });

  /* ---------- 无脚本：静态说明可见 ---------- */
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  await send("Page.navigate", { url: base });
  await sleep(1500);
  const nojs = await evaluate("(() => { const n = document.getElementById('nojs'); return { shown: Boolean(n && n.offsetHeight > 0), root: document.getElementById('root').childElementCount }; })()");
  check(nojs.shown && nojs.root === 0, "关闭脚本：静态说明可见，应用没有挂载");
  await shot("1440-no-js");
  await send("Emulation.setScriptExecutionDisabled", { value: false });

  /* ================= 手机 390，触屏 ================= */
  check(await open(390, 844, "", { touch: true }), "手机：页面载入");
  await record();
  await shot("390-cover");
  check(await evaluate("getComputedStyle(document.querySelector('.rail-list')).display === 'none' && getComputedStyle(document.querySelector('.rail-toggle')).display !== 'none'"), "手机：章节栏收成顶部条，目录默认收起");
  await evaluate("document.querySelector('.rail-toggle').click()");
  await sleep(200);
  check(await evaluate("getComputedStyle(document.querySelector('.rail-list')).display !== 'none'"), "手机：点「目录」展开章节列表");
  await shot("390-toc");
  await evaluate("document.querySelector('.rail-toggle').click()");
  for (const ch of ["brief", "site", "pick", "layouts", "styles", "compare", "ladder", "open", "appendix"]) {
    await scrollTo(`#${ch}`);
    await sleep(500);
    await record();
    await shot(`390-${ch}`);
  }
  await scrollTo('[data-fig="style"] .fig-stage');
  check(await waitFig("style"), "手机：装修三维激活");
  check(await evaluate("getComputedStyle(document.querySelector('[data-fig=\"style\"] .arm')).display !== 'none'"), "手机：工具条里有「操作三维」按钮");
  check(await evaluate("getComputedStyle(document.querySelector('[data-fig=\"style\"] .gesture > *')).pointerEvents === 'none'"), "手机：未点「操作三维」前，画布不接收手势");
  await record();
  await shot("390-style-fig");

  /* ---------- 汇总 ---------- */
  check(stats.font >= 11.95, `最小字号 ${stats.font.toFixed(2)} px（下限 12，SVG 文字按显示宽度换算）`);
  check(stats.overflow <= 0, `横向溢出 ${stats.overflow} px`);
  check(stats.arcsOut === 0, `门扇弧线落在画出的房间之外：${stats.arcsOut} 处`);
  check(stats.broken === 0, `图片加载失败：${stats.broken} 张`);
  check(errors.length === 0, `控制台报错 ${errors.length} 条${errors.length ? "：\n    " + errors.slice(0, 8).join("\n    ") : ""}`);
} finally {
  chrome.kill();
}

const fail = results.filter(([ok]) => !ok).length;
console.log(`\n截图 ${shots} 张，断言 ${results.length} 项：通过 ${results.length - fail}，失败 ${fail}`);
if (fail) process.exitCode = 1;
