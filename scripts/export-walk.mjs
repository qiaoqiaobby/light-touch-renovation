// 导出漫游页数据快照到旁边的 light-touch-walk 仓库
// 用法：node scripts/export-walk.mjs [目标仓库路径，默认 ../light-touch-walk]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import esbuild from "esbuild";

const target = resolve(process.argv[2] || "../light-touch-walk");
const dir = resolve(target, "src/walk/data");
if (!existsSync(resolve(target, "CLAUDE.md"))) {
  console.error(`找不到漫游仓库：${target}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
mkdirSync("mid", { recursive: true });

const audit = spawnSync(process.execPath, ["scripts/audit-plan.mjs"], { stdio: "inherit" });
if ((audit.status ?? 1) !== 0) {
  console.error("户型审查失败，不导出");
  process.exit(audit.status ?? 1);
}

const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain", "--", "src", "boards/data"], { encoding: "utf8" }).trim() ? "1" : "0";

await esbuild.build({
  entryPoints: ["scripts/export-walk.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "mid/export-walk.mjs",
  logLevel: "silent",
});
const run = spawnSync(process.execPath, ["mid/export-walk.mjs", resolve(dir, "house.json"), commit, dirty], { stdio: "inherit" });
process.exit(run.status ?? 1);
