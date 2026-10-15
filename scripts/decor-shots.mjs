// 页面四截图：无头 Chrome 打开构建好的 file:// 页面，经 window.__decor.set 切换
// 用法：node scripts/decor-shots.mjs <html 路径>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = resolve(process.argv[2]);
const outDir = resolve(root, "mid/shots/decor");
const PORT = 9336;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${resolve(root, "mid/chrome-profile-decor")}`,
  "--allow-file-access-from-files",
  "--enable-unsafe-swiftshader",
  "--use-angle=swiftshader",
  "--ignore-gpu-blocklist",
  "about:blank",
], { stdio: "ignore" });

const schemes = ["S1", "S2", "S3", "S4"];
const views = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath"];
const stages = { S1: ["L0", "L1", "L2"], S2: ["L0", "L1", "L2", "L3"], S3: ["L0", "L1", "L2", "L3"], S4: ["L0", "L1", "L2"] };

try {
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); }
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
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Runtime.enable");
  await send("Page.enable");
  const url = pathToFileURL(html).href;
  const open = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send("Page.navigate", { url });
    for (let i = 0; i < 40; i++) {
      const ready = await evaluate("Boolean(window.__decor)");
      if (ready) return;
      await sleep(250);
    }
    throw new Error("页面没有暴露 __decor");
  };
  const setState = (patch) => evaluate(`window.__decor.set(${JSON.stringify(patch)})`);
  const probe = () => evaluate(`(() => {
    const sizes = [];
    document.querySelectorAll("body *").forEach((e) => {
      if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
      sizes.push(parseFloat(getComputedStyle(e).fontSize));
    });
    return { font: Math.min(...sizes), overflow: document.documentElement.scrollWidth - window.innerWidth, stats: window.__decor.stats() };
  })()`);
  const shot = async (name) => {
    const { result } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(result.data, "base64"));
  };

  let n = 0;
  let minFont = Infinity;
  let overflow = 0;
  let maxTri = 0;
  let maxDraw = 0;
  let maxLights = 0;
  await open(1440, 900);
  for (const scheme of schemes) {
    for (const view of views) {
      for (const light of ["day", "night"]) {
        await setState({ scheme, stage: "L3", view, light, scene: "daily" });
        const info = await probe();
        minFont = Math.min(minFont, info.font);
        overflow = Math.max(overflow, info.overflow);
        maxTri = Math.max(maxTri, info.stats.triangles);
        maxDraw = Math.max(maxDraw, info.stats.drawCalls);
        maxLights = Math.max(maxLights, info.stats.lights);
        await shot(`${scheme}-L3-${view}-${light}`);
        n++;
      }
    }
    for (const stage of stages[scheme]) {
      await setState({ scheme, stage, view: "L-entry", light: "day", scene: "daily" });
      await shot(`${scheme}-${stage}-L-entry-day`);
      n++;
    }
    await setState({ scheme, stage: "L3", view: "orbit", light: "day", scene: "daily" });
    await shot(`${scheme}-orbit-day`);
    n++;
  }
  await open(390, 844);
  for (const scheme of schemes) {
    await setState({ scheme, stage: "L3", view: "L-entry", light: "day", scene: "daily" });
    const info = await probe();
    minFont = Math.min(minFont, info.font);
    overflow = Math.max(overflow, info.overflow);
    await shot(`${scheme}-narrow`);
    n++;
  }
  console.log(`截图 ${n} 张，最小字号 ${minFont}，横向溢出 ${overflow}，报错 ${errors.length}，三角面 ${maxTri}，绘制调用 ${maxDraw}，夜晚灯 ${maxLights}`);
  if (errors.length) console.log(errors.slice(0, 12).join("\n"));
  if (errors.length || minFont < 12 || overflow > 0 || maxTri > 1500000 || maxDraw > 1500 || maxLights > 16) process.exitCode = 1;
} finally {
  chrome.kill();
}
