import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import esbuild from "esbuild";

mkdirSync("mid", { recursive: true });
await esbuild.build({
  entryPoints: ["src/floorplan/audit.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "mid/plan-audit.mjs",
  logLevel: "silent",
});
const result = spawnSync(process.execPath, ["mid/plan-audit.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
