import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * 交付页的拼贴数据：构建时调用 boards/scripts/board-data.mjs（先跑方案检查），
 * 只把页面要用的裁切和检查结论交给浏览器。裁切是 data URI，随 JS 一起内联进单文件。
 */
function boardData(): Plugin {
  const id = "virtual:present-board";
  return {
    name: "present-board",
    resolveId: (source) => (source === id ? `\0${id}` : null),
    async load(source) {
      if (source !== `\0${id}`) return null;
      const url: string = new URL("./boards/scripts/board-data.mjs", import.meta.url).href;
      const mod = (await import(url)) as { boardData: (meta: object) => { problems: string[]; data: { crops: object; facts: object } } };
      const { problems, data } = mod.boardData({});
      if (problems.length) throw new Error(`方案检查失败 ${problems.length} 项：${problems.join("；")}`);
      const crops = Object.fromEntries(
        Object.entries(data.crops as Record<string, Record<string, unknown>>).map(([key, c]) => [
          key,
          { name: c.name, take: c.take, img: c.img, w: c.w, h: c.h, palette: c.palette, src: c.src },
        ]),
      );
      return `export const CROPS = ${JSON.stringify(crops)};\nexport const FACTS = ${JSON.stringify(data.facts)};\n`;
    },
  };
}

/** 页面上的日期：构建脚本用 PRESENT_DATE 传入时间戳对应的日期，开发时用当天。 */
function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), boardData()],
  define: { __PRESENT_DATE__: JSON.stringify(loadEnv(mode, ".", "PRESENT_").PRESENT_DATE || today()) },
  base: "./",
  build: {
    outDir: "mid/present-dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 8000,
    rolldownOptions: { input: "present.html" },
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
  },
}));
