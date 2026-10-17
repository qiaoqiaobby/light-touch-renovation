// 把 Vite 的单入口构建产物内联成一个可双击打开的 HTML。
// 装修页（build-decor.mjs）和交付页（build-present.mjs）共用：只允许一个 JS、最多一个 CSS，内联后不得残留外部 URL。
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function inlineDist(dist, htmlName) {
  const assets = readdirSync(resolve(dist, "assets"));
  const js = assets.filter((name) => name.endsWith(".js"));
  const css = assets.filter((name) => name.endsWith(".css"));
  if (js.length !== 1 || css.length > 1) throw new Error(`构建产物不是单文件：${assets.join(", ")}`);

  let html = readFileSync(resolve(dist, htmlName), "utf8");
  const script = readFileSync(resolve(dist, "assets", js[0]), "utf8").replace(/<\/script/gi, "<\\/script");
  html = html.replace(/<script\b[^>]*src="\.\/assets\/[^"]+\.js"[^>]*><\/script>/, () => `<script type="module">${script}</script>`);
  if (css.length) {
    const style = readFileSync(resolve(dist, "assets", css[0]), "utf8");
    html = html.replace(/<link\b[^>]*href="\.\/assets\/[^"]+\.css"[^>]*>/, () => `<style>${style}</style>`);
  }
  html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");
  // data: URI（如内联图标）不算外部引用
  const outside = html.replace(/<style>[\s\S]*<\/style>/, "").replace(/<script[\s\S]*<\/script>/, "");
  if (/(?:src|href)=(?!["']?data:)|url\((?!["']?data:)/.test(outside)) {
    const external = outside.match(/(?:src|href|url\()[^)"'\s>]*/g) ?? [];
    throw new Error(`外部 URL：${external.join(", ")}`);
  }
  return html;
}
